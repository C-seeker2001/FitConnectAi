import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { z } from "zod";
import { insertUserSchema, insertWorkoutSchema, insertPostSchema, insertCommentSchema } from "@shared/schema";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "fitsocial-secret-key",
    })
  );

  // API Routes
  // -------------------- AUTH ROUTES --------------------

  // Get current authenticated user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      // Don't send password to client
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.session.userId = user.id;
      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
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
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get stats for the user
      const workoutCount = await storage.getUserWorkoutCount(userId);
      const followerCount = await storage.getUserFollowerCount(userId);
      const followingCount = await storage.getUserFollowingCount(userId);
      const isFollowing = await storage.isFollowing(req.session.userId, userId);
      const currentStreak = await storage.getUserWorkoutStreak(userId);
      const weeklyWorkouts = await storage.getUserWeeklyWorkoutCount(userId);
      
      // Don't send password to client
      const { password, ...userWithoutPassword } = user;
      
      res.json({
        ...userWithoutPassword,
        workoutCount,
        followerCount,
        followingCount,
        isFollowing,
        currentStreak,
        weeklyWorkouts,
        weeklyGoal: user.weeklyGoal || 4,
      });
    } catch (error) {
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
        const liked = await storage.hasUserLikedPost(req.session.userId!, post.id);
        return { ...post, liked };
      }));
      
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
      
      let date: Date | null = null;
      if (dateStr) {
        date = new Date(dateStr);
      }
      
      const workouts = await storage.getUserWorkouts(req.session.userId, filter, date);
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
      const totalWorkouts = await storage.getUserWorkoutCount(req.session.userId);
      const weeklyWorkouts = await storage.getUserWeeklyWorkoutCount(req.session.userId);
      const following = await storage.getUserFollowingCount(req.session.userId);
      const followers = await storage.getUserFollowerCount(req.session.userId);
      const currentStreak = await storage.getUserWorkoutStreak(req.session.userId);
      
      // Get user to get the weekly goal
      const user = await storage.getUser(req.session.userId);
      const weeklyGoal = user ? user.weeklyGoal || 4 : 4;
      
      // Calculate monthly average (workouts per month)
      const monthlyAverage = await storage.getUserMonthlyWorkoutAverage(req.session.userId);
      
      // Get workout frequency (for charts)
      const frequency = await storage.getUserWorkoutFrequency(req.session.userId);
      
      // Get workout volume over time (for charts)
      const volume = await storage.getUserWorkoutVolume(req.session.userId);
      
      res.json({
        totalWorkouts,
        weeklyWorkouts,
        following,
        followers,
        currentStreak,
        weeklyGoal,
        monthlyAverage,
        frequency,
        volume,
      });
    } catch (error) {
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

  // Get feed posts (posts from followed users and self)
  app.get("/api/posts", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const posts = await storage.getFeedPosts(req.session.userId);
      
      // Check if current user has liked each post
      const postsWithLikeStatus = await Promise.all(posts.map(async (post) => {
        const liked = await storage.hasUserLikedPost(req.session.userId!, post.id);
        return { ...post, liked };
      }));
      
      res.json(postsWithLikeStatus);
    } catch (error) {
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
