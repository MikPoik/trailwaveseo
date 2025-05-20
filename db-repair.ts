import { pool } from './server/db';

async function repairDatabaseSchema() {
  const client = await pool.connect();
  try {
    console.log('Starting database repair...');
    
    // Check if column exists first to avoid errors
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email'
    `);
    
    // If email column doesn't exist, add it
    if (checkColumn.rowCount === 0) {
      console.log('Adding missing columns to users table...');
      await client.query(`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "email" varchar UNIQUE,
        ADD COLUMN IF NOT EXISTS "first_name" varchar,
        ADD COLUMN IF NOT EXISTS "last_name" varchar,
        ADD COLUMN IF NOT EXISTS "profile_image_url" varchar
      `);
      console.log('Added missing columns to users table');
    } else {
      console.log('Users table already has the required columns');
    }
    
    // Ensure sessions table exists with correct structure
    try {
      const checkSessionsTable = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sessions'
        )
      `);
      
      if (!checkSessionsTable.rows[0].exists) {
        console.log('Creating sessions table...');
        await client.query(`
          CREATE TABLE "sessions" (
            "sid" varchar PRIMARY KEY,
            "sess" jsonb NOT NULL,
            "expire" timestamp NOT NULL
          )
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire")
        `);
        console.log('Created sessions table');
      }
    } catch (error) {
      console.error('Error checking/creating sessions table:', error);
    }
    
    console.log('Database repair completed successfully');
  } catch (error) {
    console.error('Error repairing database:', error);
  } finally {
    client.release();
  }
}

repairDatabaseSchema()
  .then(() => {
    console.log('Database repair process finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database repair process failed:', error);
    process.exit(1);
  });