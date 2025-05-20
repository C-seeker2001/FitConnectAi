import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

// Create database connection
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

// Enhanced query method with detailed logging
db.query = async (text, params) => {
  console.log('DB QUERY:', text);
  console.log('DB PARAMS:', JSON.stringify(params));
  
  try {
    const start = Date.now();
    const result = await sql(text, params);
    const duration = Date.now() - start;
    
    console.log('DB RESULT:', {
      rows: result.length,
      duration: duration + 'ms',
      sample: result.length > 0 ? JSON.stringify(result[0]).substring(0, 200) + '...' : 'no rows'
    });
    
    return result;
  } catch (error) {
    console.error('DATABASE ERROR:', error);
    throw error;
  }
};

export default db; 