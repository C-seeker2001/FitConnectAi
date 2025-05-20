import { db } from './db.js';
import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';

const SessionStore = MemoryStore(session);

// This is a simplified version of the routes with just authentication
export async function registerRoutes(app) {
  // Configure session middleware
  app.use(
    session({
      cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
        stale: false
      }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      secret: process.env.SESSION_SECRET || "fitsocial-secret-key",
      name: 'connect.sid'
    })
  );

  // Middleware to check auth
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Debug endpoint - directly included in routes to save on function count
  app.get("/api/debug", async (req, res) => {
    try {
      console.log("==== DEBUG ENDPOINT CALLED ====");
      
      // Check database connection
      console.log("Testing database connection...");
      
      try {
        // Check if users table exists and has data
        const users = await db.query(`SELECT id, username, email FROM users LIMIT 5`);
        console.log("USERS TABLE:", { 
          count: users.length,
          sample: users.map(u => ({ id: u.id, username: u.username }))
        });
        
        // Check if follows table exists and has data
        const follows = await db.query(`SELECT * FROM follows LIMIT 5`);
        console.log("FOLLOWS TABLE:", { count: follows.length });
        
        // Check if posts table exists and has data
        const posts = await db.query(`SELECT * FROM posts LIMIT 5`);
        console.log("POSTS TABLE:", { count: posts.length });
        
        // Return debug information
        return res.status(200).json({
          status: "success",
          database: {
            connected: true,
            tables: {
              users: { count: users.length, hasData: users.length > 0 },
              follows: { count: follows.length, hasData: follows.length > 0 },
              posts: { count: posts.length, hasData: posts.length > 0 }
            }
          },
          environment: {
            nodeEnv: process.env.NODE_ENV,
            vercel: process.env.VERCEL === '1'
          },
          session: req.session
        });
        
      } catch (dbError) {
        console.error("DATABASE CONNECTION ERROR:", dbError);
        return res.status(500).json({
          status: "error",
          message: "Database connection or query failed",
          error: dbError.message
        });
      }
    } catch (error) {
      console.error("GENERAL ERROR:", error);
      return res.status(500).json({
        status: "error",
        message: "Debug endpoint failed",
        error: error.message
      });
    }
  });

  // Auth endpoints
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

      // Get user from database
      const users = await db.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [userId]);
      const user = users[0];
      
      if (!user) {
        console.log(`Auth check failed - User with ID ${userId} not found in database`);
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      // Get additional user stats
      const followerCount = await getFollowerCount(userId);
      const followingCount = await getFollowingCount(userId);
      const postCount = await getPostCount(userId);

      // Don't send password to client
      const { password, ...userWithoutPassword } = user;
      console.log(`Auth check successful - User: ${user.username}`);
      
      // Add stats to user object
      const userWithStats = {
        ...userWithoutPassword,
        followerCount,
        followingCount,
        postCount
      };
      
      res.json(userWithStats);
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

      // Get user from database
      const users = await db.query(`SELECT * FROM users WHERE username = $1 LIMIT 1`, [username]);
      const user = users[0];
      
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

      // Get additional user stats
      const followerCount = await getFollowerCount(user.id);
      const followingCount = await getFollowingCount(user.id);
      const postCount = await getPostCount(user.id);

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user;
      
      // Add stats to user object
      const userWithStats = {
        ...userWithoutPassword,
        followerCount,
        followingCount,
        postCount
      };
      
      res.json(userWithStats);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      console.log(`Registration attempt for: ${username}, ${email}`);
      
      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, email and password are required" });
      }
      
      // Basic validation
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ message: "Please enter a valid email" });
      }

      // Check if username already exists
      const existingUserResult = await db.query(`SELECT id FROM users WHERE username = $1 LIMIT 1`, [username]);
      
      if (existingUserResult.length > 0) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Check if email already exists
      const existingEmailResult = await db.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
      
      if (existingEmailResult.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Insert the new user
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
      const now = new Date().toISOString();
      
      const insertResult = await db.query(`
        INSERT INTO users (username, email, password, avatar, bio, weekly_goal, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, username, email, avatar, bio, weekly_goal, created_at, updated_at
      `, [
        username, 
        email, 
        password,
        avatar,
        '',
        4,
        now,
        now
      ]);
      
      if (!insertResult || insertResult.length === 0) {
        throw new Error("Failed to create user");
      }
      
      const newUser = insertResult[0];
      
      return res.status(201).json(newUser);
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ 
        message: "Server error",
        error: error.message
      });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // -------------------- FEED ENDPOINTS --------------------
  
  // Get user feed
  app.get("/api/feed", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      console.log(`Fetching feed for user ID: ${userId}`);
      
      // Get users the current user follows
      const followingList = await db.query(
        `SELECT following_id FROM follows WHERE follower_id = $1`,
        [userId]
      );
      
      console.log(`User ${userId} follows ${followingList.length} users`);
      
      // If user doesn't follow anyone, return empty feed
      if (!followingList.length) {
        console.log(`User ${userId} doesn't follow anyone, returning empty feed`);
        return res.json([]);
      }
      
      // Extract the user IDs
      const followingIds = followingList.map(follow => follow.following_id);
      // Add current user to see their own posts
      followingIds.push(userId);
      
      console.log('Feed user IDs:', followingIds);
      
      // Get posts from those users, most recent first - use IN clause instead of ANY
      const posts = await db.query(
        `SELECT 
          p.*,
          u.username,
          u.avatar,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as liked_by_me
        FROM 
          posts p
        JOIN 
          users u ON p.user_id = u.id
        WHERE 
          p.user_id IN (${followingIds.map((_, i) => `$${i + 2}`).join(',')})
        ORDER BY 
          p.created_at DESC
        LIMIT 20`,
        [userId, ...followingIds]
      );
      
      console.log(`Found ${posts.length} posts for feed`);
      res.json(posts);
    } catch (error) {
      console.error("Feed fetch error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------- USER ENDPOINTS --------------------

  // Get user profile
  app.get("/api/users/:username", async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`Fetching profile for username: ${username}`);
      
      // Get the user
      const users = await db.query(
        `SELECT id, username, email, avatar, bio, weekly_goal, created_at FROM users WHERE username = $1 LIMIT 1`, 
        [username]
      );
      
      if (!users.length) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = users[0];
      
      // Get stats
      const followerCount = await getFollowerCount(user.id);
      const followingCount = await getFollowingCount(user.id);
      const postCount = await getPostCount(user.id);
      
      // If logged in, check if current user follows this user
      let isFollowing = false;
      if (req.session.userId) {
        const followResult = await db.query(
          `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
          [req.session.userId, user.id]
        );
        isFollowing = followResult.length > 0;
      }
      
      res.json({
        ...user,
        followerCount,
        followingCount,
        postCount,
        isFollowing
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user posts
  app.get("/api/users/:username/posts", async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`Fetching posts for username: ${username}`);
      
      // Get the user ID
      const users = await db.query(
        `SELECT id FROM users WHERE username = $1 LIMIT 1`, 
        [username]
      );
      
      if (!users.length) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userId = users[0].id;
      const currentUserId = req.session.userId || null;
      
      // Get posts
      const posts = await db.query(
        `SELECT 
          p.*,
          u.username,
          u.avatar,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) as liked_by_me
        FROM 
          posts p
        JOIN 
          users u ON p.user_id = u.id
        WHERE 
          p.user_id = $1
        ORDER BY 
          p.created_at DESC
        LIMIT 20`,
        [userId, currentUserId]
      );
      
      res.json(posts);
    } catch (error) {
      console.error("User posts fetch error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------- FOLLOW ENDPOINTS --------------------
  
  // Get followers
  app.get("/api/users/:username/followers", async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`Fetching followers for username: ${username}`);
      
      // Get the user ID
      const users = await db.query(
        `SELECT id FROM users WHERE username = $1 LIMIT 1`, 
        [username]
      );
      
      if (!users.length) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userId = users[0].id;
      
      // Get followers
      const followers = await db.query(
        `SELECT 
          u.id, u.username, u.avatar
        FROM 
          follows f
        JOIN 
          users u ON f.follower_id = u.id
        WHERE 
          f.following_id = $1
        ORDER BY 
          f.created_at DESC
        LIMIT 100`,
        [userId]
      );
      
      res.json(followers);
    } catch (error) {
      console.error("Followers fetch error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get following
  app.get("/api/users/:username/following", async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`Fetching following for username: ${username}`);
      
      // Get the user ID
      const users = await db.query(
        `SELECT id FROM users WHERE username = $1 LIMIT 1`, 
        [username]
      );
      
      if (!users.length) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userId = users[0].id;
      
      // Get following
      const following = await db.query(
        `SELECT 
          u.id, u.username, u.avatar
        FROM 
          follows f
        JOIN 
          users u ON f.following_id = u.id
        WHERE 
          f.follower_id = $1
        ORDER BY 
          f.created_at DESC
        LIMIT 100`,
        [userId]
      );
      
      res.json(following);
    } catch (error) {
      console.error("Following fetch error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Follow a user
  app.post("/api/users/:username/follow", requireAuth, async (req, res) => {
    try {
      const { username } = req.params;
      const followerId = req.session.userId;
      
      // Get the user to follow
      const users = await db.query(
        `SELECT id FROM users WHERE username = $1 LIMIT 1`, 
        [username]
      );
      
      if (!users.length) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const followingId = users[0].id;
      
      // Check if already following
      const existingFollow = await db.query(
        `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
        [followerId, followingId]
      );
      
      if (existingFollow.length > 0) {
        return res.status(400).json({ message: "Already following this user" });
      }
      
      // Create follow
      await db.query(
        `INSERT INTO follows (follower_id, following_id, created_at) VALUES ($1, $2, $3)`,
        [followerId, followingId, new Date().toISOString()]
      );
      
      res.status(200).json({ message: "Successfully followed user" });
    } catch (error) {
      console.error("Follow error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Unfollow a user
  app.delete("/api/users/:username/follow", requireAuth, async (req, res) => {
    try {
      const { username } = req.params;
      const followerId = req.session.userId;
      
      // Get the user to unfollow
      const users = await db.query(
        `SELECT id FROM users WHERE username = $1 LIMIT 1`, 
        [username]
      );
      
      if (!users.length) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const followingId = users[0].id;
      
      // Delete follow
      await db.query(
        `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
        [followerId, followingId]
      );
      
      res.status(200).json({ message: "Successfully unfollowed user" });
    } catch (error) {
      console.error("Unfollow error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Add a simple test endpoint
  app.get("/api/test", (req, res) => {
    res.status(200).json({
      message: "API is working!",
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

// Helper functions for counts
async function getFollowerCount(userId) {
  const result = await db.query(
    `SELECT COUNT(*) as count FROM follows WHERE following_id = $1`,
    [userId]
  );
  return parseInt(result[0]?.count || '0');
}

async function getFollowingCount(userId) {
  const result = await db.query(
    `SELECT COUNT(*) as count FROM follows WHERE follower_id = $1`,
    [userId]
  );
  return parseInt(result[0]?.count || '0');
}

async function getPostCount(userId) {
  const result = await db.query(
    `SELECT COUNT(*) as count FROM posts WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result[0]?.count || '0');
} 