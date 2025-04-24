import {
  User,
  InsertUser,
  Workout,
  InsertWorkout,
  Exercise,
  InsertExercise,
  Set,
  InsertSet,
  Post,
  InsertPost,
  Comment,
  InsertComment,
  Like,
  InsertLike,
  Follow,
  InsertFollow,
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(search?: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  
  // Workout methods
  getUserWorkouts(userId: number, filter?: string, date?: Date | null): Promise<any[]>;
  getWorkout(id: number): Promise<any | undefined>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, workout: Partial<Workout>): Promise<Workout>;
  deleteWorkout(id: number): Promise<boolean>;
  getUserWorkoutCount(userId: number): Promise<number>;
  getUserWeeklyWorkoutCount(userId: number): Promise<number>;
  getUserMonthlyWorkoutAverage(userId: number): Promise<number>;
  getUserWorkoutStreak(userId: number): Promise<number>;
  getUserWorkoutFrequency(userId: number): Promise<any[]>;
  getUserWorkoutVolume(userId: number): Promise<any[]>;
  getUserActivityData(userId: number): Promise<any[]>;
  
  // Exercise methods
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // Set methods
  getSet(id: number): Promise<Set | undefined>;
  createSet(set: InsertSet): Promise<Set>;
  
  // Post methods
  getPost(id: number): Promise<any | undefined>;
  getUserPosts(userId: number): Promise<any[]>;
  getFeedPosts(userId: number): Promise<any[]>;
  createPost(post: InsertPost): Promise<Post>;
  deletePost(id: number): Promise<boolean>;
  
  // Comment methods
  getComment(id: number): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  
  // Like methods
  hasUserLikedPost(userId: number, postId: number): Promise<boolean>;
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: number, postId: number): Promise<boolean>;
  
  // Follow methods
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  createFollow(follow: InsertFollow): Promise<Follow>;
  deleteFollow(followerId: number, followingId: number): Promise<boolean>;
  getUserFollowerCount(userId: number): Promise<number>;
  getUserFollowingCount(userId: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workouts: Map<number, Workout>;
  private exercises: Map<number, Exercise>;
  private sets: Map<number, Set>;
  private posts: Map<number, Post>;
  private comments: Map<number, Comment>;
  private likes: Map<number, Like>;
  private follows: Map<number, Follow>;
  
  private currentUserId: number;
  private currentWorkoutId: number;
  private currentExerciseId: number;
  private currentSetId: number;
  private currentPostId: number;
  private currentCommentId: number;
  private currentLikeId: number;
  private currentFollowId: number;

  constructor() {
    this.users = new Map();
    this.workouts = new Map();
    this.exercises = new Map();
    this.sets = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.likes = new Map();
    this.follows = new Map();
    
    this.currentUserId = 1;
    this.currentWorkoutId = 1;
    this.currentExerciseId = 1;
    this.currentSetId = 1;
    this.currentPostId = 1;
    this.currentCommentId = 1;
    this.currentLikeId = 1;
    this.currentFollowId = 1;
    
    // Create some initial users for testing
    this.initializeData();
  }

  private initializeData() {
    // Create sample users
    const user1 = this.createUser({
      username: "johndoe",
      password: "password123",
      email: "john@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe",
      bio: "Fitness enthusiast and software developer",
      weeklyGoal: 4,
      useMetric: true,
    });
    
    const user2 = this.createUser({
      username: "janedoe",
      password: "password123",
      email: "jane@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=janedoe",
      bio: "Runner and yoga instructor",
      weeklyGoal: 5,
      useMetric: true,
    });
    
    // Add follow relationships
    this.createFollow({
      followerId: user1.id,
      followingId: user2.id,
    });
    
    this.createFollow({
      followerId: user2.id,
      followingId: user1.id,
    });
    
    // Create sample workouts
    const workout1 = this.createWorkout({
      userId: user1.id,
      name: "Upper Body Workout",
      useMetric: true,
    });
    
    const exercise1 = this.createExercise({
      workoutId: workout1.id,
      name: "Bench Press",
    });
    
    this.createSet({
      exerciseId: exercise1.id,
      weight: 80,
      reps: 10,
    });
    
    this.createSet({
      exerciseId: exercise1.id,
      weight: 85,
      reps: 8,
    });
    
    const exercise2 = this.createExercise({
      workoutId: workout1.id,
      name: "Pull Ups",
    });
    
    this.createSet({
      exerciseId: exercise2.id,
      reps: 8,
    });
    
    // Create sample posts
    const post1 = this.createPost({
      userId: user1.id,
      workoutId: workout1.id,
      content: "Just finished a great upper body workout. Hit a new PR on bench press!",
    });
    
    this.createComment({
      postId: post1.id,
      userId: user2.id,
      content: "Great job! What's your new PR?",
    });
    
    this.createLike({
      userId: user2.id,
      postId: post1.id,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUsers(search?: string): Promise<User[]> {
    let users = Array.from(this.users.values());
    
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        (user.bio && user.bio.toLowerCase().includes(searchLower))
      );
    }
    
    return users;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    
    const user: User = {
      id,
      username: userData.username,
      password: userData.password,
      email: userData.email,
      avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
      bio: userData.bio || null,
      weeklyGoal: userData.weeklyGoal || 4,
      useMetric: userData.useMetric !== undefined ? userData.useMetric : true,
      createdAt: now,
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }

  // Workout methods
  async getUserWorkouts(userId: number, filter: string = 'all', date: Date | null = null): Promise<any[]> {
    let workouts = Array.from(this.workouts.values())
      .filter(workout => workout.userId === userId);
    
    // Filter by date if provided
    if (date) {
      workouts = workouts.filter(workout => {
        const workoutDate = new Date(workout.startTime);
        return workoutDate.toDateString() === date.toDateString();
      });
    }
    
    // Filter by type if needed
    if (filter !== 'all') {
      // In a real application, we would have a type field on workouts
      // For now, just filter by name as a simple example
      workouts = workouts.filter(workout => 
        workout.name.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    // Sort by most recent first
    workouts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Enrich workout data
    return Promise.all(workouts.map(async workout => {
      const exercises = Array.from(this.exercises.values())
        .filter(exercise => exercise.workoutId === workout.id);
      
      // Calculate stats
      let totalVolume = 0;
      let allExerciseNames: string[] = [];
      
      for (const exercise of exercises) {
        allExerciseNames.push(exercise.name);
        
        const exerciseSets = Array.from(this.sets.values())
          .filter(set => set.exerciseId === exercise.id);
        
        for (const set of exerciseSets) {
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
        exerciseCount: exercises.length,
        exercises: allExerciseNames,
      };
    }));
  }

  async getWorkout(id: number): Promise<any | undefined> {
    const workout = this.workouts.get(id);
    if (!workout) return undefined;
    
    const exercises = Array.from(this.exercises.values())
      .filter(exercise => exercise.workoutId === id);
    
    // Enrich each exercise with its sets
    const enrichedExercises = await Promise.all(exercises.map(async exercise => {
      const exerciseSets = Array.from(this.sets.values())
        .filter(set => set.exerciseId === exercise.id)
        .sort((a, b) => a.id - b.id);
      
      return {
        ...exercise,
        sets: exerciseSets,
      };
    }));
    
    return {
      ...workout,
      exercises: enrichedExercises,
    };
  }

  async createWorkout(workoutData: InsertWorkout): Promise<Workout> {
    const id = this.currentWorkoutId++;
    const now = new Date();
    
    const workout: Workout = {
      id,
      userId: workoutData.userId,
      name: workoutData.name,
      startTime: now,
      endTime: null,
      notes: workoutData.notes || null,
      useMetric: workoutData.useMetric !== undefined ? workoutData.useMetric : true,
      createdAt: now,
    };
    
    this.workouts.set(id, workout);
    return workout;
  }

  async updateWorkout(id: number, workoutData: Partial<Workout>): Promise<Workout> {
    const workout = this.workouts.get(id);
    if (!workout) {
      throw new Error("Workout not found");
    }
    
    const updatedWorkout = { ...workout, ...workoutData };
    this.workouts.set(id, updatedWorkout);
    
    return updatedWorkout;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    // First, find and delete all exercises and sets
    const exercises = Array.from(this.exercises.values())
      .filter(exercise => exercise.workoutId === id);
    
    for (const exercise of exercises) {
      // Delete all sets for this exercise
      const exerciseSets = Array.from(this.sets.values())
        .filter(set => set.exerciseId === exercise.id);
      
      for (const set of exerciseSets) {
        this.sets.delete(set.id);
      }
      
      // Delete the exercise
      this.exercises.delete(exercise.id);
    }
    
    // Delete the workout
    return this.workouts.delete(id);
  }

  async getUserWorkoutCount(userId: number): Promise<number> {
    return Array.from(this.workouts.values())
      .filter(workout => workout.userId === userId)
      .length;
  }

  async getUserWeeklyWorkoutCount(userId: number): Promise<number> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    return Array.from(this.workouts.values())
      .filter(workout => {
        return workout.userId === userId && 
               new Date(workout.startTime) >= startOfWeek;
      })
      .length;
  }

  async getUserMonthlyWorkoutAverage(userId: number): Promise<number> {
    const workouts = Array.from(this.workouts.values())
      .filter(workout => workout.userId === userId);
    
    if (workouts.length === 0) return 0;
    
    // Get the date of the first workout
    const dates = workouts.map(w => new Date(w.startTime));
    const firstWorkoutDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const now = new Date();
    
    // Calculate months between first workout and now
    const months = (now.getFullYear() - firstWorkoutDate.getFullYear()) * 12 +
                   (now.getMonth() - firstWorkoutDate.getMonth());
    
    // If less than a month, return the count
    if (months < 1) return workouts.length;
    
    return Math.round((workouts.length / months) * 10) / 10; // Round to 1 decimal
  }

  async getUserWorkoutStreak(userId: number): Promise<number> {
    const workouts = Array.from(this.workouts.values())
      .filter(workout => workout.userId === userId)
      .sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    
    if (workouts.length === 0) return 0;
    
    // Check if the user worked out today
    const today = new Date().toDateString();
    const lastWorkoutDate = new Date(workouts[0].startTime).toDateString();
    const hasWorkedOutToday = today === lastWorkoutDate;
    
    if (!hasWorkedOutToday) return 0;
    
    // Calculate streak
    let streak = 1;
    let currentDate = new Date(workouts[0].startTime);
    currentDate.setDate(currentDate.getDate() - 1);
    
    for (let i = 1; i < workouts.length; i++) {
      const workoutDate = new Date(workouts[i].startTime);
      
      // Check if this workout is from the previous day
      if (workoutDate.toDateString() === currentDate.toDateString()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (workoutDate.toDateString() !== currentDate.toDateString()) {
        // If not consecutive, break the streak
        break;
      }
    }
    
    return streak;
  }

  async getUserWorkoutFrequency(userId: number): Promise<any[]> {
    // Get the last 30 days
    const result = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const count = Array.from(this.workouts.values())
        .filter(workout => {
          const workoutDate = new Date(workout.startTime);
          return workout.userId === userId && 
                 workoutDate.toDateString() === date.toDateString();
        })
        .length;
      
      result.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      });
    }
    
    return result;
  }

  async getUserWorkoutVolume(userId: number): Promise<any[]> {
    // Get total volume per workout for the last 10 workouts
    const workouts = Array.from(this.workouts.values())
      .filter(workout => workout.userId === userId)
      .sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      .slice(-10);
    
    const result = await Promise.all(workouts.map(async workout => {
      const exercises = Array.from(this.exercises.values())
        .filter(exercise => exercise.workoutId === workout.id);
      
      let totalVolume = 0;
      
      for (const exercise of exercises) {
        const exerciseSets = Array.from(this.sets.values())
          .filter(set => set.exerciseId === exercise.id);
        
        for (const set of exerciseSets) {
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      }
      
      return {
        date: new Date(workout.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: Math.round(totalVolume),
      };
    }));
    
    return result;
  }

  async getUserActivityData(userId: number): Promise<any[]> {
    // Get workout count per month for the last 12 months
    const result = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      
      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const count = Array.from(this.workouts.values())
        .filter(workout => {
          const workoutDate = new Date(workout.startTime);
          return workout.userId === userId && 
                 workoutDate >= date && 
                 workoutDate < nextMonth;
        })
        .length;
      
      result.push({
        date: `${month} ${year}`,
        count,
      });
    }
    
    return result;
  }

  // Exercise methods
  async getExercise(id: number): Promise<Exercise | undefined> {
    return this.exercises.get(id);
  }

  async createExercise(exerciseData: InsertExercise): Promise<Exercise> {
    const id = this.currentExerciseId++;
    const now = new Date();
    
    const exercise: Exercise = {
      id,
      workoutId: exerciseData.workoutId,
      name: exerciseData.name,
      createdAt: now,
    };
    
    this.exercises.set(id, exercise);
    return exercise;
  }

  // Set methods
  async getSet(id: number): Promise<Set | undefined> {
    return this.sets.get(id);
  }

  async createSet(setData: InsertSet): Promise<Set> {
    const id = this.currentSetId++;
    const now = new Date();
    
    const set: Set = {
      id,
      exerciseId: setData.exerciseId,
      weight: setData.weight !== undefined ? setData.weight : null,
      reps: setData.reps !== undefined ? setData.reps : null,
      duration: setData.duration !== undefined ? setData.duration : null,
      distance: setData.distance !== undefined ? setData.distance : null,
      rpe: setData.rpe !== undefined ? setData.rpe : null,
      createdAt: now,
    };
    
    this.sets.set(id, set);
    return set;
  }

  // Post methods
  async getPost(id: number): Promise<any | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    // Get user info
    const user = this.users.get(post.userId);
    if (!user) return undefined;
    
    // Get workout info if available
    let workoutData = null;
    if (post.workoutId) {
      const workout = await this.getWorkout(post.workoutId);
      if (workout) {
        workoutData = {
          id: workout.id,
          name: workout.name,
          duration: workout.duration || '45m',
          volume: workout.volume || 1000,
          exerciseCount: workout.exercises.length,
          exercises: workout.exercises.map((e: any) => e.name || e),
          useMetric: workout.useMetric,
        };
      }
    }
    
    // Get comments
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.postId === id)
      .sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    
    // Enrich comments with user info
    const enrichedComments = await Promise.all(comments.map(async comment => {
      const commentUser = this.users.get(comment.userId);
      
      return {
        ...comment,
        user: {
          id: commentUser?.id,
          username: commentUser?.username,
          avatar: commentUser?.avatar,
        },
      };
    }));
    
    // Get like count
    const likeCount = Array.from(this.likes.values())
      .filter(like => like.postId === id)
      .length;
    
    return {
      ...post,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      workout: workoutData,
      comments: enrichedComments,
      commentCount: comments.length,
      likeCount,
    };
  }

  async getUserPosts(userId: number): Promise<any[]> {
    const posts = Array.from(this.posts.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    
    // Enrich posts with user info, comments, likes, etc.
    return Promise.all(posts.map(post => this.getPost(post.id)));
  }

  async getFeedPosts(userId: number): Promise<any[]> {
    // Get posts from the user and users they follow
    const followingIds = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);
    
    // Add the user's own ID to get their posts too
    followingIds.push(userId);
    
    const posts = Array.from(this.posts.values())
      .filter(post => followingIds.includes(post.userId))
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    
    // Enrich posts with user info, comments, likes, etc.
    return Promise.all(posts.map(post => this.getPost(post.id)));
  }

  async createPost(postData: InsertPost): Promise<Post> {
    const id = this.currentPostId++;
    const now = new Date();
    
    const post: Post = {
      id,
      userId: postData.userId,
      workoutId: postData.workoutId || null,
      content: postData.content,
      image: postData.image || null,
      createdAt: now,
    };
    
    this.posts.set(id, post);
    return post;
  }

  async deletePost(id: number): Promise<boolean> {
    // Delete all comments for this post
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.postId === id);
    
    for (const comment of comments) {
      this.comments.delete(comment.id);
    }
    
    // Delete all likes for this post
    const likes = Array.from(this.likes.values())
      .filter(like => like.postId === id);
    
    for (const like of likes) {
      this.likes.delete(like.id);
    }
    
    // Delete the post
    return this.posts.delete(id);
  }

  // Comment methods
  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const now = new Date();
    
    const comment: Comment = {
      id,
      postId: commentData.postId,
      userId: commentData.userId,
      parentId: commentData.parentId || null,
      content: commentData.content,
      createdAt: now,
    };
    
    this.comments.set(id, comment);
    return comment;
  }

  async deleteComment(id: number): Promise<boolean> {
    // Get comment to be deleted
    const comment = this.comments.get(id);
    if (!comment) return false;
    
    // Delete all child comments if they exist
    const childComments = Array.from(this.comments.values())
      .filter(c => c.parentId === id);
    
    for (const childComment of childComments) {
      this.comments.delete(childComment.id);
    }
    
    // Delete the comment
    return this.comments.delete(id);
  }

  // Like methods
  async hasUserLikedPost(userId: number, postId: number): Promise<boolean> {
    return Array.from(this.likes.values())
      .some(like => like.userId === userId && like.postId === postId);
  }

  async createLike(likeData: InsertLike): Promise<Like> {
    const id = this.currentLikeId++;
    const now = new Date();
    
    const like: Like = {
      id,
      userId: likeData.userId,
      postId: likeData.postId,
      createdAt: now,
    };
    
    this.likes.set(id, like);
    return like;
  }

  async deleteLike(userId: number, postId: number): Promise<boolean> {
    const like = Array.from(this.likes.values())
      .find(like => like.userId === userId && like.postId === postId);
    
    if (!like) return false;
    
    return this.likes.delete(like.id);
  }

  // Follow methods
  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.follows.values())
      .some(follow => follow.followerId === followerId && follow.followingId === followingId);
  }

  async createFollow(followData: InsertFollow): Promise<Follow> {
    const id = this.currentFollowId++;
    const now = new Date();
    
    const follow: Follow = {
      id,
      followerId: followData.followerId,
      followingId: followData.followingId,
      createdAt: now,
    };
    
    this.follows.set(id, follow);
    return follow;
  }

  async deleteFollow(followerId: number, followingId: number): Promise<boolean> {
    const follow = Array.from(this.follows.values())
      .find(follow => follow.followerId === followerId && follow.followingId === followingId);
    
    if (!follow) return false;
    
    return this.follows.delete(follow.id);
  }

  async getUserFollowerCount(userId: number): Promise<number> {
    return Array.from(this.follows.values())
      .filter(follow => follow.followingId === userId)
      .length;
  }

  async getUserFollowingCount(userId: number): Promise<number> {
    return Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .length;
  }
}

// Switch from in-memory storage to database storage
import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();
