import { db } from '../dist/server/db.js';
import { users, insertUserSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

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
    console.log('Registration attempt:', req.body);
    const userData = insertUserSchema.parse(req.body);
    
    // Check if username already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, userData.username));
      
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username already taken" });
    }
    
    // Check if email already exists
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email));
      
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }
    
    // Insert new user
    const newUsers = await db.insert(users).values({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
      bio: '',
      weeklyGoal: 4,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    const newUser = newUsers[0];
    
    // Don't return password to client
    const { password, ...userWithoutPassword } = newUser;
    
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    
    return res.status(500).json({ 
      message: "Server error",
      error: error.message
    });
  }
} 