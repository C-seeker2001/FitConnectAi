import express from 'express';
import { registerRoutes } from '../server/routes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize the app only once
let initialized = false;
const initializeApp = async () => {
  if (!initialized) {
    await registerRoutes(app);
    initialized = true;
  }
};

export default async function handler(req, res) {
  try {
    await initializeApp();
    return app(req, res);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
} 