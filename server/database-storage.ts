import {
  User,
  InsertUser,
  Workout,
  InsertWorkout,
  Exercise,
  InsertExercise,
  InsertSet,
  Post,
  InsertPost,
  Comment,
  InsertComment,
  Like,
  InsertLike,
  Follow,
  InsertFollow,
  users,
  workouts,
  exercises,
  sets,
  posts,
  comments,
  likes,
  follows,
} from "@shared/schema";

// Import SetModel type separately to avoid collision with JavaScript's built-in Set
import type { Set as SetModel } from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, count, inArray } from "drizzle-orm";
import { getDay, startOfWeek, startOfMonth, addDays, addMonths, subMonths, format } from "date-fns";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsers(search?: string): Promise<User[]> {
    if (!search) {
      return db.select().from(users);
    }
    
    const searchLower = search.toLowerCase();
    const results = await db.select().from(users);
    
    // Filter in memory for now - in a production app this would use SQL LIKE operators
    return results.filter(user => 
      user.username.toLowerCase().includes(searchLower) ||
      (user.bio && user.bio.toLowerCase().includes(searchLower))
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const now = new Date();
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
        bio: userData.bio || null,
        weeklyGoal: userData.weeklyGoal || 4,
        useMetric: userData.useMetric !== undefined ? userData.useMetric : true,
        createdAt: now,
      })
      .returning();
    
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  // Workout methods
  async getUserWorkouts(userId: number, filter: string = 'all', date: Date | null = null): Promise<any[]> {
    let workoutQuery = db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.createdAt));
    
    if (date) {
      // If date is provided, filter by that specific date (matching by day)
      const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      workoutQuery = db
        .select()
        .from(workouts)
        .where(and(
          eq(workouts.userId, userId),
          gte(workouts.createdAt, startDate),
          lte(workouts.createdAt, endDate)
        ))
        .orderBy(desc(workouts.createdAt));
    }
    
    const workoutsList = await workoutQuery;
    
    // Filter by type if needed (filter by name as a simple example)
    let filteredWorkouts = workoutsList;
    if (filter !== 'all') {
      filteredWorkouts = workoutsList.filter(workout => 
        workout.name.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    // Enrich workout data
    return Promise.all(filteredWorkouts.map(async (workout) => {
      const exercisesList = await db
        .select()
        .from(exercises)
        .where(eq(exercises.workoutId, workout.id));
      
      // Calculate stats
      let totalVolume = 0;
      let allExerciseNames: string[] = [];
      
      for (const exercise of exercisesList) {
        allExerciseNames.push(exercise.name);
        
        const setsList = await db
          .select()
          .from(sets)
          .where(eq(sets.exerciseId, exercise.id));
        
        for (const set of setsList) {
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      }
      
      // Format duration as 1h 23m or 45m
      let duration = "";
      if (workout.endTime) {
        const durationMs = new Date(workout.endTime).getTime() - new Date(workout.startTime).getTime();
        const minutes = Math.floor(durationMs / (1000 * 60));
        
        if (minutes < 60) {
          duration = `${minutes}m`;
        } else {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          duration = `${hours}h ${remainingMinutes}m`;
        }
      } else {
        duration = "In progress";
      }
      
      return {
        ...workout,
        duration,
        volume: Math.round(totalVolume),
        exerciseCount: exercisesList.length,
        exercises: allExerciseNames,
      };
    }));
  }

  async getWorkout(id: number): Promise<any | undefined> {
    const [workout] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, id));
    
    if (!workout) return undefined;
    
    const exercisesList = await db
      .select()
      .from(exercises)
      .where(eq(exercises.workoutId, id));
    
    // Enrich each exercise with its sets
    const enrichedExercises = await Promise.all(exercisesList.map(async (exercise) => {
      const setsList = await db
        .select()
        .from(sets)
        .where(eq(sets.exerciseId, exercise.id));
      
      return {
        ...exercise,
        sets: setsList,
      };
    }));
    
    return {
      ...workout,
      exercises: enrichedExercises,
    };
  }

  async createWorkout(workoutData: InsertWorkout): Promise<Workout> {
    const now = new Date();
    const [workout] = await db
      .insert(workouts)
      .values({
        ...workoutData,
        createdAt: now,
        startTime: now,
        endTime: null,
        notes: null,
      })
      .returning();
    
    return workout;
  }

  async updateWorkout(id: number, workoutData: Partial<Workout>): Promise<Workout> {
    const [updatedWorkout] = await db
      .update(workouts)
      .set(workoutData)
      .where(eq(workouts.id, id))
      .returning();
    
    if (!updatedWorkout) {
      throw new Error("Workout not found");
    }
    
    return updatedWorkout;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    // First delete related records (exercises, sets)
    const exercisesList = await db
      .select()
      .from(exercises)
      .where(eq(exercises.workoutId, id));
    
    for (const exercise of exercisesList) {
      await db
        .delete(sets)
        .where(eq(sets.exerciseId, exercise.id));
    }
    
    await db
      .delete(exercises)
      .where(eq(exercises.workoutId, id));
    
    // Delete related posts
    await db
      .delete(posts)
      .where(eq(posts.workoutId, id));
    
    // Delete the workout
    const result = await db
      .delete(workouts)
      .where(eq(workouts.id, id));
    
    return result.rowCount > 0;
  }

  async getUserWorkoutCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(workouts)
      .where(eq(workouts.userId, userId));
    
    return result[0]?.count || 0;
  }

  async getUserWeeklyWorkoutCount(userId: number): Promise<number> {
    const today = new Date();
    const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
    
    const result = await db
      .select()
      .from(workouts)
      .where(and(
        eq(workouts.userId, userId),
        gte(workouts.createdAt, startOfWeekDate)
      ));
    
    return result.length;
  }

  async getUserMonthlyWorkoutAverage(userId: number): Promise<number> {
    const today = new Date();
    const threeMonthsAgo = subMonths(today, 3);
    
    const workoutsByMonth: { [key: string]: number } = {};
    
    // Initialize months
    let currentMonth = threeMonthsAgo;
    while (currentMonth <= today) {
      const monthKey = format(currentMonth, 'yyyy-MM');
      workoutsByMonth[monthKey] = 0;
      currentMonth = addMonths(currentMonth, 1);
    }
    
    // Get workouts for the last 3 months
    const workoutsList = await db
      .select()
      .from(workouts)
      .where(and(
        eq(workouts.userId, userId),
        gte(workouts.createdAt, threeMonthsAgo)
      ));
    
    // Count workouts per month
    for (const workout of workoutsList) {
      const monthKey = format(new Date(workout.createdAt), 'yyyy-MM');
      if (workoutsByMonth[monthKey] !== undefined) {
        workoutsByMonth[monthKey]++;
      }
    }
    
    // Calculate average
    const months = Object.values(workoutsByMonth);
    return months.reduce((sum, count) => sum + count, 0) / months.length;
  }

  async getUserWorkoutStreak(userId: number): Promise<number> {
    // For a proper streak calculation, we would need to query workouts by day
    // This is a simplified implementation
    const allWorkouts = await db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.createdAt));
    
    if (allWorkouts.length === 0) return 0;
    
    // Get dates of all workouts
    const workoutDates = allWorkouts.map(w => {
      const date = new Date(w.createdAt);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    });
    
    // Remove duplicate dates (multiple workouts on same day)
    const uniqueDates = [...new Set(workoutDates)].sort((a, b) => b - a);
    
    // Check if the most recent workout was today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();
    
    // If the most recent workout wasn't today or yesterday, streak is 0
    if (uniqueDates[0] !== todayTime && uniqueDates[0] !== yesterdayTime) {
      return 0;
    }
    
    // Calculate streak by checking consecutive days
    let streak = 1;
    let currentDate = uniqueDates[0] === todayTime ? yesterday : new Date(yesterday);
    currentDate.setDate(currentDate.getDate() - 1);
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const workoutDate = new Date(uniqueDates[i]);
      
      if (workoutDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (workoutDate.getTime() < currentDate.getTime()) {
        // Skip ahead to this date
        currentDate = new Date(workoutDate);
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // Gap in streak
        break;
      }
    }
    
    return streak;
  }

  async getUserWorkoutFrequency(userId: number): Promise<any[]> {
    const today = new Date();
    const sixMonthsAgo = subMonths(today, 6);
    
    // Get workouts for the last 6 months
    const workoutsList = await db
      .select()
      .from(workouts)
      .where(and(
        eq(workouts.userId, userId),
        gte(workouts.createdAt, sixMonthsAgo)
      ));
    
    // Group workouts by day of week
    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, ..., Sat
    
    for (const workout of workoutsList) {
      const day = getDay(new Date(workout.createdAt));
      dayCount[day]++;
    }
    
    // Format for chart display
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.map((name, index) => ({
      name,
      count: dayCount[index],
    }));
  }

  async getUserWorkoutVolume(userId: number): Promise<any[]> {
    const today = new Date();
    const sixMonthsAgo = subMonths(today, 6);
    
    // Get user's workouts from last 6 months
    const workoutsList = await db
      .select()
      .from(workouts)
      .where(and(
        eq(workouts.userId, userId),
        gte(workouts.createdAt, sixMonthsAgo)
      ))
      .orderBy(workouts.createdAt);
    
    const volumeByMonth: Record<string, number> = {};
    
    // Initialize months
    for (let i = 0; i <= 6; i++) {
      const date = subMonths(today, 6 - i);
      const monthKey = format(date, 'MMM');
      volumeByMonth[monthKey] = 0;
    }
    
    // Calculate volume for each workout
    for (const workout of workoutsList) {
      const exercisesList = await db
        .select()
        .from(exercises)
        .where(eq(exercises.workoutId, workout.id));
      
      let workoutVolume = 0;
      
      for (const exercise of exercisesList) {
        const setsList = await db
          .select()
          .from(sets)
          .where(eq(sets.exerciseId, exercise.id));
        
        for (const set of setsList) {
          if (set.weight && set.reps) {
            workoutVolume += set.weight * set.reps;
          }
        }
      }
      
      const monthKey = format(new Date(workout.createdAt), 'MMM');
      if (volumeByMonth[monthKey] !== undefined) {
        volumeByMonth[monthKey] += workoutVolume;
      }
    }
    
    // Convert to array format for charts
    return Object.entries(volumeByMonth).map(([month, volume]) => ({
      month,
      volume: Math.round(volume),
    }));
  }

  async getUserActivityData(userId: number): Promise<any[]> {
    const today = new Date();
    const sixMonthsAgo = subMonths(today, 6);
    
    // Get all workouts in the last 6 months
    const workoutsList = await db
      .select()
      .from(workouts)
      .where(and(
        eq(workouts.userId, userId),
        gte(workouts.createdAt, sixMonthsAgo)
      ));
    
    // Group workouts by month
    const monthlyData: Record<string, number> = {};
    
    // Initialize months
    for (let i = 0; i <= 6; i++) {
      const date = subMonths(today, 6 - i);
      const monthKey = format(date, 'MMM yyyy');
      monthlyData[monthKey] = 0;
    }
    
    // Count workouts per month
    for (const workout of workoutsList) {
      const monthKey = format(new Date(workout.createdAt), 'MMM yyyy');
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey]++;
      }
    }
    
    // Convert to array format for charts
    return Object.entries(monthlyData).map(([date, count]) => ({
      date,
      count,
    }));
  }

  // Exercise methods
  async getExercise(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, id));
    
    return exercise || undefined;
  }

  async createExercise(exerciseData: InsertExercise): Promise<Exercise> {
    const [exercise] = await db
      .insert(exercises)
      .values({
        ...exerciseData,
        createdAt: new Date(),
      })
      .returning();
    
    return exercise;
  }

  // Set methods
  async getSet(id: number): Promise<SetModel | undefined> {
    const [set] = await db
      .select()
      .from(sets)
      .where(eq(sets.id, id));
    
    return set || undefined;
  }

  async createSet(setData: InsertSet): Promise<SetModel> {
    const [set] = await db
      .insert(sets)
      .values(setData)
      .returning();
    
    return set;
  }

  // Post methods
  async getPost(id: number): Promise<any | undefined> {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id));
    
    if (!post) return undefined;
    
    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, post.userId));
    
    // Get workout info if applicable
    let workout = null;
    if (post.workoutId) {
      const [workoutData] = await db
        .select()
        .from(workouts)
        .where(eq(workouts.id, post.workoutId));
      
      if (workoutData) {
        const exercisesList = await db
          .select()
          .from(exercises)
          .where(eq(exercises.workoutId, workoutData.id));
        
        workout = {
          ...workoutData,
          exerciseCount: exercisesList.length,
        };
      }
    }
    
    // Get comment count
    const commentResult = await db
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.postId, id));
    
    const commentCount = commentResult[0]?.count || 0;
    
    // Get like count
    const likeResult = await db
      .select({ count: count() })
      .from(likes)
      .where(eq(likes.postId, id));
    
    const likeCount = likeResult[0]?.count || 0;
    
    // Combine all data
    return {
      ...post,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      workout,
      commentCount,
      likeCount,
    };
  }

  async getUserPosts(userId: number): Promise<any[]> {
    const postsList = await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));
    
    // Enrich posts with user, workout, and count data
    return Promise.all(postsList.map(async post => {
      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, post.userId));
      
      // Get workout info if applicable
      let workout = null;
      if (post.workoutId) {
        const [workoutData] = await db
          .select()
          .from(workouts)
          .where(eq(workouts.id, post.workoutId));
        
        if (workoutData) {
          const exercisesList = await db
            .select()
            .from(exercises)
            .where(eq(exercises.workoutId, workoutData.id));
          
          workout = {
            ...workoutData,
            exerciseCount: exercisesList.length,
          };
        }
      }
      
      // Get comment count
      const commentResult = await db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.postId, post.id));
      
      const commentCount = commentResult[0]?.count || 0;
      
      // Get like count
      const likeResult = await db
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.postId, post.id));
      
      const likeCount = likeResult[0]?.count || 0;
      
      // Combine all data
      return {
        ...post,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
        workout,
        commentCount,
        likeCount,
      };
    }));
  }

  async getFeedPosts(userId: number): Promise<any[]> {
    // Get users that the current user follows
    const followingList = await db
      .select()
      .from(follows)
      .where(eq(follows.followerId, userId));
    
    const followingIds = followingList.map(f => f.followingId);
    followingIds.push(userId); // Include user's own posts
    
    // If we have no posts to return, return empty array
    if (followingIds.length === 0) {
      return [];
    }
    
    // Get posts from those users - use inArray for compatibility
    const postsList = await db
      .select()
      .from(posts)
      .where(inArray(posts.userId, followingIds))
      .orderBy(desc(posts.createdAt));
    
    // Enrich posts with user, workout, and count data
    return Promise.all(postsList.map(async post => {
      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, post.userId));
      
      // Get workout info if applicable
      let workout = null;
      if (post.workoutId) {
        const [workoutData] = await db
          .select()
          .from(workouts)
          .where(eq(workouts.id, post.workoutId));
        
        if (workoutData) {
          const exercisesList = await db
            .select()
            .from(exercises)
            .where(eq(exercises.workoutId, workoutData.id));
          
          workout = {
            ...workoutData,
            exerciseCount: exercisesList.length,
          };
        }
      }
      
      // Get comment count
      const commentResult = await db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.postId, post.id));
      
      const commentCount = commentResult[0]?.count || 0;
      
      // Get like count
      const likeResult = await db
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.postId, post.id));
      
      const likeCount = likeResult[0]?.count || 0;
      
      // Combine all data
      return {
        ...post,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
        workout,
        commentCount,
        likeCount,
      };
    }));
  }

  async createPost(postData: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        ...postData,
        createdAt: new Date(),
        image: null,
      })
      .returning();
    
    return post;
  }

  async deletePost(id: number): Promise<boolean> {
    // Delete related comments and likes first
    await db
      .delete(comments)
      .where(eq(comments.postId, id));
    
    await db
      .delete(likes)
      .where(eq(likes.postId, id));
    
    // Delete the post
    const result = await db
      .delete(posts)
      .where(eq(posts.id, id));
    
    return result.rowCount > 0;
  }

  // Comment methods
  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id));
    
    return comment || undefined;
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values({
        ...commentData,
        createdAt: new Date(),
      })
      .returning();
    
    return comment;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db
      .delete(comments)
      .where(eq(comments.id, id));
    
    return result.rowCount > 0;
  }

  // Like methods
  async hasUserLikedPost(userId: number, postId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.postId, postId)
      ));
    
    return !!like;
  }

  async createLike(likeData: InsertLike): Promise<Like> {
    const [like] = await db
      .insert(likes)
      .values(likeData)
      .returning();
    
    return like;
  }

  async deleteLike(userId: number, postId: number): Promise<boolean> {
    const result = await db
      .delete(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.postId, postId)
      ));
    
    return result.rowCount > 0;
  }

  // Follow methods
  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ));
    
    return !!follow;
  }

  async createFollow(followData: InsertFollow): Promise<Follow> {
    const [follow] = await db
      .insert(follows)
      .values(followData)
      .returning();
    
    return follow;
  }

  async deleteFollow(followerId: number, followingId: number): Promise<boolean> {
    const result = await db
      .delete(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ));
    
    return result.rowCount > 0;
  }

  async getUserFollowerCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));
    
    return result[0]?.count || 0;
  }

  async getUserFollowingCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId));
    
    return result[0]?.count || 0;
  }
}