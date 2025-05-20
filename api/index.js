import express from 'express';
import { registerRoutes } from '../server/routes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Export a function that creates a handler for Vercel
export default async function handler(req, res) {
  try {
    // Use Express routes
    await registerRoutes(app);
    
    // Forward the request to Express
    return app(req, res);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
} 