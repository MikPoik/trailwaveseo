import { pool } from './server/db';

async function recreateSchema() {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Drop existing tables if they exist
    await client.query('DROP TABLE IF EXISTS sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS settings CASCADE');
    await client.query('DROP TABLE IF EXISTS analyses CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');

    // Create users table with correct column names
    await client.query(`
      CREATE TABLE "users" (
        "id" varchar PRIMARY KEY NOT NULL,
        "email" varchar UNIQUE,
        "first_name" varchar,
        "last_name" varchar,
        "profile_image_url" varchar,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    
    // Create sessions table for auth
    await client.query(`
      CREATE TABLE "sessions" (
        "sid" varchar PRIMARY KEY,
        "sess" jsonb NOT NULL,
        "expire" timestamp NOT NULL
      );
    `);
    
    await client.query(`CREATE INDEX "IDX_session_expire" ON "sessions" ("expire");`);
    
    // Create analyses table
    await client.query(`
      CREATE TABLE "analyses" (
        "id" serial PRIMARY KEY,
        "user_id" varchar REFERENCES "users" ("id"),
        "domain" text NOT NULL,
        "date" timestamp NOT NULL DEFAULT now(),
        "pages_count" integer NOT NULL,
        "metrics" jsonb NOT NULL,
        "pages" jsonb NOT NULL,
        "content_repetition_analysis" jsonb
      );
    `);
    
    // Create settings table
    await client.query(`
      CREATE TABLE "settings" (
        "id" serial PRIMARY KEY,
        "user_id" varchar REFERENCES "users" ("id"),
        "max_pages" integer NOT NULL DEFAULT 20,
        "crawl_delay" integer NOT NULL DEFAULT 500,
        "follow_external_links" boolean NOT NULL DEFAULT false,
        "analyze_images" boolean NOT NULL DEFAULT true,
        "analyze_link_structure" boolean NOT NULL DEFAULT true,
        "use_ai" boolean NOT NULL DEFAULT true
      );
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('Database schema recreated successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recreating database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

recreateSchema()
  .then(() => {
    console.log('Schema recreation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema recreation failed:', error);
    process.exit(1);
  });