import { pool } from './server/db';

async function addUsageTracking() {
  const client = await pool.connect();
  try {
    console.log('Adding usage tracking columns to users table...');
    
    // Add pages_analyzed column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS pages_analyzed integer NOT NULL DEFAULT 0
    `);
    
    // Add page_limit column  
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS page_limit integer NOT NULL DEFAULT 5
    `);
    
    console.log('Usage tracking columns added successfully');
  } catch (error) {
    console.error('Error adding usage tracking columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.main) {
  addUsageTracking()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}