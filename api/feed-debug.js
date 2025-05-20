import { db } from './db.js';

// Standalone endpoint for debugging database connectivity and content
export default async function handler(req, res) {
  try {
    console.log("==== FEED DEBUG ENDPOINT CALLED ====");
    console.log("METHOD:", req.method);
    console.log("QUERY:", req.query);
    console.log("BODY:", req.body);
    console.log("HEADERS:", req.headers);
    
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
        }
      });
      
    } catch (dbError) {
      console.error("DATABASE CONNECTION ERROR:", dbError);
      return res.status(500).json({
        status: "error",
        message: "Database connection or query failed",
        error: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      });
    }
  } catch (error) {
    console.error("GENERAL ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Debug endpoint failed",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 