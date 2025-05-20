import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Create Express instance
const app = express();

// Enable CORS for all requests
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Keep track if we've initialized the app
let isInitialized = false;
let routesModule;

// Initialize the app only once
const initializeApp = async () => {
  if (!isInitialized) {
    try {
      // Dynamically import routes to ensure ESM compatibility
      routesModule = await import('../dist/server/routes.js');
      await routesModule.registerRoutes(app);
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      throw error;
    }
  }
};

// Export the serverless handler
export default async function handler(req, res) {
  try {
    // Log incoming request for debugging
    console.log(`[Vercel API] ${req.method} ${req.url}`);
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Initialize if not already initialized
    await initializeApp();
    
    // Handle the request with Express
    return app(req, res);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 