import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

// Create database connection
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

// Simple query method for raw SQL
db.query = async (text, params) => {
  try {
    return await sql(text, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export default db; 