import { db } from './server/db';
import { users, sessions, analyses, settings } from './shared/schema';
import { sql } from 'drizzle-orm';

async function setupDatabase() {
  console.log('Setting up database schema...');

  // Create sessions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sessions" (
      "sid" varchar PRIMARY KEY,
      "sess" jsonb NOT NULL,
      "expire" timestamp NOT NULL
    );
  `);
  
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");`);

  // Create users table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" varchar PRIMARY KEY NOT NULL,
      "email" varchar UNIQUE,
      "first_name" varchar,
      "last_name" varchar,
      "profile_image_url" varchar,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );
  `);

  // Create analyses table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "analyses" (
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
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "settings" (
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

  console.log('Database schema setup complete.');
}

setupDatabase().catch(console.error);