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

// Create database schema definitions directly
const users = {
  id: {},
  username: {},
  email: {},
  password: {},
  avatar: {},
  bio: {},
  weeklyGoal: {},
  createdAt: {},
  updatedAt: {}
};

export default async function handler(req, res) {
  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }
  
  try {
    const { username, password } = req.body;
    console.log(`Standalone login attempt for: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    // Connect to database directly
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Simple SQL query to find user by username and password
    const query = `SELECT * FROM users WHERE username = $1 LIMIT 1`;
    const params = [username];
    
    const result = await sql(query, params);
    console.log('Query result:', result);
    
    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    const user = result[0];
    
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    // Don't send password to client
    const { password: _, ...userWithoutPassword } = user;
    
    // Log successful login
    console.log(`User logged in successfully: ${username} (ID: ${user.id})`);
    
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      message: "Server error",
      error: error.message
    });
  }
} 