import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { z } from "zod";
import { insertUserSchema, insertWorkoutSchema, insertPostSchema, insertCommentSchema, follows, users, posts, comments, likes, workouts, exercises } from "@shared/schema";
import MemoryStore from "memorystore";
import { db } from "./db";
import { eq, count, and, desc, inArray } from "drizzle-orm";

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(
    session({
      cookie: { 
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        secure: false, // Set to false to work in development
        sameSite: 'lax',
        path: '/'
      },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: true,
      saveUninitialized: true,
      secret: process.env.SESSION_SECRET || "fitsocial-secret-key",
      name: 'connect.sid'
    })
  );

  // API Routes
  // -------------------- AUTH ROUTES --------------------

  // Debug test route for follow counts
  app.get("/api/debug/follows/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Direct database queries to check follow data
      const followerResult = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, userId));

      const followingResult = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followerId, userId));

      // Check the actual follow records
      const followersList = await db
        .select()
        .from(follows)
        .where(eq(follows.followingId, userId));

      const followingList = await db
        .select()
        .from(follows)
        .where(eq(follows.followerId, userId));

      // Get posts for feed from user's following list
      const followingIds = followingList.map(f => f.followingId);
      console.log('Following IDs for feed:', followingIds);

      // Get posts from those users
      let feedPosts = [];
      if (followingIds.length > 0) {
        feedPosts = await db
          .select()
          .from(posts)
          .where(inArray(posts.userId, followingIds))
          .orderBy(desc(posts.createdAt))
          .limit(10);

        console.log(`Found ${feedPosts.length} posts for feed`);
      }

      res.json({
        userId,
        followerCount: followerResult[0]?.count || 0,
        followingCount: followingResult[0]?.count || 0,
        followersList,
        followingList,
        feedSample: feedPosts.slice(0, 3) // Return first 3 posts for inspection
      });
    } catch (error) {
      console.error("Error in debug route:", error);
      res.status(500).json({ message: "Server error", error: String(error) });
    }
  });

  // Get current authenticated user
  app.get("/api/auth/me", async (req, res) => {
    console.log("Auth check - Session:", req.session);

    if (!req.session.userId) {
      console.log("Auth check failed - No userId in session");
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = req.session.userId;
      console.log(`Auth check - Fetching user with ID: ${userId}`);

      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`Auth check failed - User with ID ${userId} not found in database`);
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      // Don't send password to client
      const { password, ...userWithoutPassword } = user;
      console.log(`Auth check successful - User: ${user.username}`);
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log(`Login attempt for username: ${username}`);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`User not found: ${username}`);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (user.password !== password) {
        console.log(`Password mismatch for user: ${username}`);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Set the session
      req.session.userId = user.id;
      console.log(`User logged in successfully: ${username} (ID: ${user.id})`);

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create the user
      const newUser = await storage.createUser(userData);
      req.session.userId = newUser.id;

      // Don't send password to client
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // -------------------- USER ROUTES --------------------

  // Get all users (with search)
  app.get("/api/users", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const searchTerm = req.query.search as string || "";
      const users = await storage.getUsers(searchTerm);

      // Add isFollowing flag for current user
      const usersWithFollowStatus = await Promise.all(users.map(async (user) => {
        const isFollowing = await storage.isFollowing(req.session.userId!, user.id);
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          isFollowing,
        };
      }));

      res.json(usersWithFollowStatus);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get specific user
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      console.log(`Profile request - Loading profile for user ID: ${userId}`);

      const user = await storage.getUser(userId);

      if (!user) {
        console.log(`Profile request - User ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }

      // Get stats for the user
      console.log(`Found user: ${user.username}, getting stats...`);

      const workoutCount = await storage.getUserWorkoutCount(userId);
      console.log(`Workout count: ${workoutCount}`);

      const followerCount = await storage.getUserFollowerCount(userId);
      console.log(`Follower count: ${followerCount}`);

      const followingCount = await storage.getUserFollowingCount(userId);
      console.log(`Following count: ${followingCount}`);

      const isFollowing = await storage.isFollowing(req.session.userId, userId);
      console.log(`Is current user following this user? ${isFollowing}`);

      const currentStreak = await storage.getUserWorkoutStreak(userId);
      const weeklyWorkouts = await storage.getUserWeeklyWorkoutCount(userId);

      // Don't send password to client
      const { password, ...userWithoutPassword } = user;

      const responseData = {
        ...userWithoutPassword,
        workoutCount,
        followerCount,
        followingCount,
        isFollowing,
        currentStreak,
        weeklyWorkouts,
        weeklyGoal: user.weeklyGoal || 4,
      };

      console.log(`Sending profile response for ${user.username}:`, responseData);
      res.json(responseData);
    } catch (error) {
      console.error("Error in /api/users/:id:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Follow a user
  app.post("/api/users/:id/follow", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const followingId = parseInt(req.params.id);
      const followerId = req.session.userId;

      // Check if already following
      const isAlreadyFollowing = await storage.isFollowing(followerId, followingId);
      if (isAlreadyFollowing) {
        return res.status(400).json({ message: "Already following this user" });
      }

      // Create follow relationship
      await storage.createFollow({
        followerId,
        followingId,
      });

      res.status(201).json({ message: "Successfully followed user" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Unfollow a user
  app.delete("/api/users/:id/follow", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const followingId = parseInt(req.params.id);
      const followerId = req.session.userId;

      await storage.deleteFollow(followerId, followingId);

      res.status(200).json({ message: "Successfully unfollowed user" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update user profile
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = parseInt(req.params.id);

      // Only allow users to update their own profile
      if (userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to update this profile" });
      }

      const { username, email, bio, weeklyGoal } = req.body;

      // Check if username is already taken by another user
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      // Update user profile
      const updatedUser = await storage.updateUser(userId, {
        username,
        email,
        bio,
        weeklyGoal: weeklyGoal ? parseInt(weeklyGoal) : undefined,
      });

      // Don't send password to client
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user activity data
  app.get("/api/users/:id/activity", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = parseInt(req.params.id);
      // Check if requested user exists
      const userExists = await storage.getUser(userId);
      if (!userExists) {
        return res.status(404).json({ message: "User not found" });
      }

      const activityData = await storage.getUserActivityData(userId);
      res.json(activityData);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user posts
  app.get("/api/users/:id/posts", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = parseInt(req.params.id);
      const posts = await storage.getUserPosts(userId);

      // Check if current user has liked each post
      const postsWithLikeStatus = await Promise.all(posts.map(async (post) => {
        const liked = req.session.userId ? await storage.hasUserLikedPost(req.session.userId, post.id) : false;
        return { ...post, liked };
      }));

      console.log(`Sending ${postsWithLikeStatus.length} posts with like status`);
      res.json(postsWithLikeStatus);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------- WORKOUT ROUTES --------------------

  // Get all workouts for current user
  app.get("/api/workouts", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const filter = req.query.filter as string || "all";
      const dateStr = req.query.date as string || null;
      // Fix: Ensure targetUserId is properly set
      const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : req.session.userId;

      console.log(`Getting workouts for user ${targetUserId} with filter: ${filter}`);

      let date: Date | null = null;
      if (dateStr) {
        date = new Date(dateStr);
      }

      const workouts = await storage.getUserWorkouts(targetUserId, filter, date);
      console.log(`Found ${workouts.length} workouts`);
      res.json(workouts);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create a new workout
  app.post("/api/workouts", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { name, exercises, shareToFeed, useMetric } = req.body;

      if (!name || !exercises || !Array.isArray(exercises)) {
        return res.status(400).json({ message: "Invalid workout data" });
      }

      // Create workout
      const workout = await storage.createWorkout({
        userId: req.session.userId,
        name,
        useMetric: useMetric !== undefined ? useMetric : true,
      });

      // Create exercises and sets
      for (const exerciseData of exercises) {
        if (!exerciseData.name || !exerciseData.sets || !Array.isArray(exerciseData.sets)) {
          continue;
        }

        const exercise = await storage.createExercise({
          workoutId: workout.id,
          name: exerciseData.name,
        });

        for (const setData of exerciseData.sets) {
          await storage.createSet({
            exerciseId: exercise.id,
            ...setData,
          });
        }
      }

      // Create post if shareToFeed is true
      if (shareToFeed) {
        await storage.createPost({
          userId: req.session.userId,
          workoutId: workout.id,
          content: `Completed a ${name} workout`,
        });
      }

      res.status(201).json(workout);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get workout statistics
  app.get("/api/workouts/stats", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log(`Getting workout stats for user ${req.session.userId}...`);

      // Get basic workout counts
      const totalWorkouts = await storage.getUserWorkoutCount(req.session.userId);
      console.log(`Total workouts: ${totalWorkouts}`);

      const weeklyWorkouts = await storage.getUserWeeklyWorkoutCount(req.session.userId);
      console.log(`Weekly workouts: ${weeklyWorkouts}`);

      // Get follow counts
      const following = await storage.getUserFollowingCount(req.session.userId);
      console.log(`Following count: ${following}`);

      const followers = await storage.getUserFollowerCount(req.session.userId);
      console.log(`Followers count: ${followers}`);

      // Get streak
      const currentStreak = await storage.getUserWorkoutStreak(req.session.userId);
      console.log(`Current streak: ${currentStreak}`);

      // Get user to get the weekly goal
      const user = await storage.getUser(req.session.userId);
      const weeklyGoal = user ? user.weeklyGoal || 4 : 4;
      console.log(`Weekly goal: ${weeklyGoal}`);

      // Calculate monthly average (workouts per month)
      let monthlyAverage = 0;
      try {
        monthlyAverage = await storage.getUserMonthlyWorkoutAverage(req.session.userId);
      } catch (err) {
        console.error('Error getting monthly average:', err);
      }
      console.log(`Monthly average: ${monthlyAverage}`);

      // Get workout frequency (for charts)
      let frequency = [];
      try {
        frequency = await storage.getUserWorkoutFrequency(req.session.userId);
      } catch (err) {
        console.error('Error getting frequency:', err);
      }

      // Get workout volume over time (for charts)
      let volume = [];
      try {
        volume = await storage.getUserWorkoutVolume(req.session.userId);
      } catch (err) {
        console.error('Error getting volume:', err);
      }

      // Create response
      const response = {
        totalWorkouts,
        weeklyWorkouts,
        following,
        followers,
        currentStreak,
        weeklyGoal,
        monthlyAverage,
        frequency,
        volume,
      };

      console.log('Sending workout stats:', response);
      res.json(response);
    } catch (error) {
      console.error('Error in /api/workouts/stats:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get upcoming workouts
  app.get("/api/workouts/upcoming", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // This is just a mockup for now as we don't have a workout scheduling system
      // In a real application, this would fetch from a scheduled_workouts table
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);

      const upcomingWorkouts = [
        {
          id: 1,
          name: "Upper Body Strength",
          scheduledFor: today,
          time: "4:30 PM",
          duration: "45-60 min",
        },
        {
          id: 2,
          name: "HIIT Cardio",
          scheduledFor: tomorrow,
          time: "6:00 AM",
          duration: "20-30 min",
        },
        {
          id: 3,
          name: "Lower Body Focus",
          scheduledFor: dayAfter,
          time: "5:30 PM",
          duration: "45-60 min",
        },
      ];

      res.json(upcomingWorkouts);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get workout templates
  app.get("/api/workouts/templates", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // In a real application, this would fetch from a templates table
      // For now, we'll just return sample data
      const templates = [
        {
          id: 1,
          name: "Push Day",
          exerciseCount: 5,
          createdBy: "You",
          exercises: ["Bench Press", "Shoulder Press", "Tricep Extensions", "Chest Flys", "Lateral Raises"]
        },
        {
          id: 2,
          name: "Pull Day",
          exerciseCount: 5,
          createdBy: "You",
          exercises: ["Pull Ups", "Barbell Rows", "Face Pulls", "Bicep Curls", "Lat Pulldowns"]
        },
        {
          id: 3,
          name: "Leg Day",
          exerciseCount: 6,
          createdBy: "You",
          exercises: ["Squats", "Deadlifts", "Leg Press", "Leg Extensions", "Leg Curls", "Calf Raises"]
        },
        {
          id: 4,
          name: "Full Body",
          exerciseCount: 8,
          createdBy: "Community",
          exercises: ["Squats", "Bench Press", "Deadlifts", "Pull Ups", "Shoulder Press", "Rows", "Lunges", "Planks"]
        },
        {
          id: 5,
          name: "30 Min HIIT",
          exerciseCount: 6,
          createdBy: "Community",
          exercises: ["Burpees", "Mountain Climbers", "Jumping Jacks", "High Knees", "Push Ups", "Planks"]
        }
      ];

      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------- POST ROUTES --------------------

  // Debug feed route
  app.get("/api/debug/feed/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Get users that the current user follows
      const followingList = await db
        .select()
        .from(follows)
        .where(eq(follows.followerId, userId));

      const followingIds = followingList.map(f => f.followingId);
      console.log(`Debug feed - User ${userId} is following:`, followingIds);

      // Add the user's own ID to include their posts
      followingIds.push(userId);

      // If user follows no one and isn't themselves, return empty array
      if (followingIds.length === 0) {
        console.log(`User ${userId} is not following anyone. Returning empty feed.`);
        return res.json({ posts: [] });
      }

      // Get posts from those users
      const feedPosts = await db
        .select()
        .from(posts)
        .where(inArray(posts.userId, followingIds))
        .orderBy(desc(posts.createdAt));

      console.log(`Found ${feedPosts.length} posts for feed from ${followingIds.length} users`);
      console.log('First 3 posts:', feedPosts.slice(0, 3));

      res.json({
        userId,
        followingIds,
        postsCount: feedPosts.length,
        posts: feedPosts.slice(0, 5) // Return first 5 posts for inspection
      });
    } catch (error) {
      console.error("Error in debug feed route:", error);
      res.status(500).json({ message: "Server error", error: String(error) });
    }
  });

  // Debug login route (for testing only)
  app.get("/api/debug/login/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Get the user
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Set session
      req.session.userId = userId;

      console.log(`Logged in as user ${userId}`);

      // Don't send password to client
      const { password, ...userWithoutPassword } = user[0];
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error in debug login:", error);
      res.status(500).json({ message: "Server error", error: String(error) });
    }
  });

  // Get feed posts (posts from followed users and self)
  app.get("/api/posts", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log(`Getting feed posts for user: ${req.session.userId}`);
      const posts = await storage.getFeedPosts(req.session.userId);
      console.log(`Found ${posts.length} posts for feed`);

      // Check if current user has liked each post
      const postsWithLikeStatus = await Promise.all(posts.map(async (post) => {
        const liked = req.session.userId ? await storage.hasUserLikedPost(req.session.userId, post.id) : false;
        return { ...post, liked };
      }));

      console.log(`Sending ${postsWithLikeStatus.length} posts with like status`);
      res.json(postsWithLikeStatus);
    } catch (error) {
      console.error("Error in /api/posts:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create a new post
  app.post("/api/posts", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const postData = {
        ...req.body,
        userId: req.session.userId,
      };

      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Like a post
  app.post("/api/posts/:id/like", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const userId = req.session.userId;

      // Check if post exists
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if already liked
      const alreadyLiked = await storage.hasUserLikedPost(userId, postId);
      if (alreadyLiked) {
        return res.status(400).json({ message: "Post already liked" });
      }

      await storage.createLike({
        userId,
        postId,
      });

      res.status(201).json({ message: "Post liked successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Unlike a post
  app.delete("/api/posts/:id/like", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const userId = req.session.userId;

      await storage.deleteLike(userId, postId);

      res.status(200).json({ message: "Post unliked successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Add a comment to a post
  app.post("/api/posts/:id/comments", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const userId = req.session.userId;
      const { content, parentId } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      // Check if post exists
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // If parentId provided, check if parent comment exists
      if (parentId) {
        const parentComment = await storage.getComment(parentId);
        if (!parentComment || parentComment.postId !== postId) {
          return res.status(400).json({ message: "Invalid parent comment" });
        }
      }

      const comment = await storage.createComment({
        postId,
        userId,
        parentId: parentId || null,
        content,
      });

      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete a comment
  app.delete("/api/posts/:postId/comments/:commentId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const commentId = parseInt(req.params.commentId);
      const userId = req.session.userId;

      // Get the comment
      const comment = await storage.getComment(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Check if user owns the comment
      if (comment.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this comment" });
      }

      await storage.deleteComment(commentId);

      res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete a post
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const postId = parseInt(req.params.id);
      const userId = req.session.userId;

      // Get the post
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user owns the post
      if (post.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this post" });
      }

      await storage.deletePost(postId);

      res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------- METRICS ROUTES --------------------

  // Get workout metrics for charts
  app.get("/api/metrics/workout", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const totalWorkouts = await storage.getUserWorkoutCount(req.session.userId);
      const currentStreak = await storage.getUserWorkoutStreak(req.session.userId);
      const monthlyAverage = await storage.getUserMonthlyWorkoutAverage(req.session.userId);
      const frequency = await storage.getUserWorkoutFrequency(req.session.userId);
      const volume = await storage.getUserWorkoutVolume(req.session.userId);

      res.json({
        totalWorkouts,
        currentStreak,
        monthlyAverage,
        frequency,
        volume,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get exercise metrics for charts
  app.get("/api/metrics/exercises", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // In a real application, this would calculate actual 1RM progress
      // For now, return sample data
      const exercises = [
        {
          id: 1,
          name: "Bench Press",
          progress: [
            { date: "Jan", weight: 80 },
            { date: "Feb", weight: 85 },
            { date: "Mar", weight: 87.5 },
            { date: "Apr", weight: 90 },
          ],
          currentMax: 90,
          change: 10,
          unit: "kg",
        },
        {
          id: 2,
          name: "Squat",
          progress: [
            { date: "Jan", weight: 100 },
            { date: "Feb", weight: 110 },
            { date: "Mar", weight: 115 },
            { date: "Apr", weight: 125 },
          ],
          currentMax: 125,
          change: 25,
          unit: "kg",
        },
        {
          id: 3,
          name: "Deadlift",
          progress: [
            { date: "Jan", weight: 120 },
            { date: "Feb", weight: 130 },
            { date: "Mar", weight: 140 },
            { date: "Apr", weight: 150 },
          ],
          currentMax: 150,
          change: 30,
          unit: "kg",
        },
        {
          id: 4,
          name: "Shoulder Press",
          progress: [
            { date: "Jan", weight: 50 },
            { date: "Feb", weight: 52.5 },
            { date: "Mar", weight: 55 },
            { date: "Apr", weight: 57.5 },
          ],
          currentMax: 57.5,
          change: 7.5,
          unit: "kg",
        },
      ];

      res.json(exercises);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------- PROGRAM ROUTES --------------------

  // Get all programs
  app.get("/api/programs", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // In a real app, this would get actual programs from the database
      // For now, return sample data
      const programs = [
        {
          id: 1,
          name: "12-Week Strength Builder",
          author: "Coach Mike",
          type: "strength",
          description: "Complete strength program focused on compound movements to build overall strength and muscle.",
          rating: 4.5,
          ratingCount: 432,
        },
        {
          id: 2,
          name: "Endurance Challenge",
          author: "FitRunner",
          type: "cardio",
          description: "Progressive cardio program designed to improve endurance and cardiovascular health.",
          rating: 4.0,
          ratingCount: 289,
        },
        {
          id: 3,
          name: "Full Body Transformation",
          author: "Transform Fitness",
          type: "mixed",
          description: "Comprehensive program combining strength training, cardio, and nutrition for total body transformation.",
          rating: 5.0,
          ratingCount: 516,
        },
        {
          id: 4,
          name: "Beginner's Guide to Lifting",
          author: "StartStrong",
          type: "strength",
          description: "Perfect for beginners looking to learn proper form and build a foundation of strength.",
          rating: 4.7,
          ratingCount: 352,
        },
        {
          id: 5,
          name: "HIIT Fat Burner",
          author: "BurnItUp",
          type: "cardio",
          description: "High intensity interval training program focused on maximizing calorie burn and fat loss.",
          rating: 4.2,
          ratingCount: 178,
        },
        {
          id: 6,
          name: "5x5 Progressive Overload",
          author: "GainTrain",
          type: "strength",
          description: "Classic 5x5 workout structure with progressive overload for consistent strength gains.",
          rating: 4.8,
          ratingCount: 403,
        },
      ];

      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get trending programs
  app.get("/api/programs/trending", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // For now, just return the top 3 from our sample data
      const programs = [
        {
          id: 3,
          name: "Full Body Transformation",
          author: "Transform Fitness",
          type: "mixed",
          rating: 5.0,
          ratingCount: 516,
        },
        {
          id: 6,
          name: "5x5 Progressive Overload",
          author: "GainTrain",
          type: "strength",
          rating: 4.8,
          ratingCount: 403,
        },
        {
          id: 1,
          name: "12-Week Strength Builder",
          author: "Coach Mike",
          type: "strength",
          rating: 4.5,
          ratingCount: 432,
        },
      ];

      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get a specific program by ID
  app.get("/api/programs/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const programId = parseInt(req.params.id);

      // In a real app, this would fetch from database
      // For now, use the same sample data and filter
      const programs = [
        {
          id: 1,
          name: "12-Week Strength Builder",
          author: "Coach Mike",
          type: "strength",
          description: "Complete strength program focused on compound movements to build overall strength and muscle.",
          rating: 4.5,
          ratingCount: 432,
        },
        {
          id: 2,
          name: "Endurance Challenge",
          author: "FitRunner",
          type: "cardio",
          description: "Progressive cardio program designed to improve endurance and cardiovascular health.",
          rating: 4.0,
          ratingCount: 289,
        },
        {
          id: 3,
          name: "Full Body Transformation",
          author: "Transform Fitness",
          type: "mixed",
          description: "Comprehensive program combining strength training, cardio, and nutrition for total body transformation.",
          rating: 5.0,
          ratingCount: 516,
        },
        {
          id: 4,
          name: "Beginner's Guide to Lifting",
          author: "StartStrong",
          type: "strength",
          description: "Perfect for beginners looking to learn proper form and build a foundation of strength.",
          rating: 4.7,
          ratingCount: 352,
        },
        {
          id: 5,
          name: "HIIT Fat Burner",
          author: "BurnItUp",
          type: "cardio",
          description: "High intensity interval training program focused on maximizing calorie burn and fat loss.",
          rating: 4.2,
          ratingCount: 178,
        },
        {
          id: 6,
          name: "5x5 Progressive Overload",
          author: "GainTrain",
          type: "strength",
          description: "Classic 5x5 workout structure with progressive overload for consistent strength gains.",
          rating: 4.8,
          ratingCount: 403,
        },
      ];

      const program = programs.find(p => p.id === programId);

      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------- LEADERBOARD ROUTES --------------------

  // Get weekly workout leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // In a real app, this would query the database for users with most workouts this week
      // For now, return sample data
      const userId = req.session.userId;

      // Get current user to get avatar and username
      const currentUser = await storage.getUser(userId);

      const leaderboard = [
        {
          id: 101,
          username: "MikeWilson",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MikeWilson",
          workouts: 6,
          isCurrentUser: userId === 101,
        },
        {
          id: 102,
          username: "SarahKim",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahKim",
          workouts: 5,
          isCurrentUser: userId === 102,
        },
        {
          id: userId,
          username: currentUser?.username || "You",
          avatar: currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'user'}`,
          workouts: 4,
          isCurrentUser: true,
        },
        {
          id: 103,
          username: "EmmaRoberts",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=EmmaRoberts",
          workouts: 3,
          isCurrentUser: userId === 103,
        },
      ];

      // Sort by workouts
      leaderboard.sort((a, b) => b.workouts - a.workouts);

      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}