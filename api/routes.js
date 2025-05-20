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

  // Add a simple test endpoint
  app.get("/api/test", (req, res) => {
    res.status(200).json({
      message: "API is working!",
      timestamp: new Date().toISOString()
    });
  });

  return app;
} 