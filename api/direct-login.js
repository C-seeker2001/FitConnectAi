import { db } from '../dist/server/db.js';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }
  
  try {
    const { username, password } = req.body;
    console.log(`Direct login attempt for: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    // Query the user directly from database
    const matchingUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    
    if (matchingUsers.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    const user = matchingUsers[0];
    
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    // Don't send password to client
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      message: "Server error",
      error: error.message
    });
  }
} 