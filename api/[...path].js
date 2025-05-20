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
      // Debug info about the environment
      console.log('Current working directory:', process.cwd());
      console.log('Environment:', process.env.NODE_ENV);
      
      // Check if files exist
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // List potential module paths
        const potentialPaths = [
          '/var/task/dist/server/routes.js',  // Vercel direct path
          path.join(process.cwd(), 'dist/server/routes.js'), // Absolute path using cwd
          '../dist/server/routes.js',         // Relative path
          '../../dist/server/routes.js',      // Alternative relative path
          '/var/task/api/server/routes.js',   // Vercel API server path
          './server/routes.js',               // Local server path
        ];
        
        // Check which paths exist
        for (const p of potentialPaths) {
          try {
            await fs.access(p);
            console.log(`File exists: ${p}`);
          } catch (e) {
            console.log(`File does NOT exist: ${p}`);
          }
        }
        
        // Try to load the module from the first path that exists
        let loaded = false;
        for (const p of potentialPaths) {
          try {
            await fs.access(p);
            console.log(`Attempting to import from: ${p}`);
            routesModule = await import(p);
            console.log(`Successfully imported from ${p}`);
            loaded = true;
            break;
          } catch (e) {
            console.log(`Failed to import from ${p}:`, e.message);
          }
        }
        
        if (!loaded) {
          throw new Error('Could not load routes module from any path');
        }
      } catch (e) {
        console.log('Error in file system operations:', e);
        
        // Fallback to the original approach if fs operations fail
        try {
          routesModule = await import('/var/task/dist/server/routes.js');
        } catch (err) {
          try {
            routesModule = await import('../dist/server/routes.js');
          } catch (err2) {
            try {
              routesModule = await import('../../dist/server/routes.js');
            } catch (err3) {
              try {
                routesModule = await import('./server/routes.js');
              } catch (err4) {
                throw new Error('Could not import routes module: ' + err4.message);
              }
            }
          }
        }
      }
      
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