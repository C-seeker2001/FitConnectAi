import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import cors from 'cors';
import express from 'express';

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

export default async function handler(req, res) {
  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }
  
  try {
    const { username, password, email } = req.body;
    console.log(`Standalone registration attempt for: ${username}, ${email}`);
    
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
    
    // Connect to database directly
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Check if username already exists
    const existingUserQuery = `SELECT id FROM users WHERE username = $1 LIMIT 1`;
    const existingUserResult = await sql(existingUserQuery, [username]);
    
    if (existingUserResult.length > 0) {
      return res.status(400).json({ message: "Username already taken" });
    }
    
    // Check if email already exists
    const existingEmailQuery = `SELECT id FROM users WHERE email = $1 LIMIT 1`;
    const existingEmailResult = await sql(existingEmailQuery, [email]);
    
    if (existingEmailResult.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }
    
    // Insert the new user
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const now = new Date().toISOString();
    
    const insertQuery = `
      INSERT INTO users (username, email, password, avatar, bio, weekly_goal, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, email, avatar, bio, weekly_goal, created_at, updated_at
    `;
    
    const insertResult = await sql(insertQuery, [
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
    console.log('New user created:', newUser);
    
    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ 
      message: "Server error",
      error: error.message
    });
  }
} 