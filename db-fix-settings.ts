import { pool } from './server/db';

async function fixSettingsTable() {
  const client = await pool.connect();
  try {
    console.log('Starting settings table fix...');
    
    // Check if settings table exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'settings'
      )
    `);
    
    if (!checkTable.rows[0].exists) {
      console.log('Creating settings table...');
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
        )
      `);
      console.log('Created settings table');
    } else {
      console.log('Settings table exists, checking columns...');
      
      // Check for necessary columns
      const tableInfo = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'settings'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      console.log('Existing columns:', columns);
      
      // Add any missing columns
      if (!columns.includes('user_id')) {
        await client.query(`ALTER TABLE "settings" ADD COLUMN "user_id" varchar REFERENCES "users" ("id")`);
        console.log('Added user_id column');
      }
      
      if (!columns.includes('max_pages')) {
        await client.query(`ALTER TABLE "settings" ADD COLUMN "max_pages" integer NOT NULL DEFAULT 20`);
        console.log('Added max_pages column');
      }
      
      if (!columns.includes('crawl_delay')) {
        await client.query(`ALTER TABLE "settings" ADD COLUMN "crawl_delay" integer NOT NULL DEFAULT 500`);
        console.log('Added crawl_delay column');
      }
      
      if (!columns.includes('follow_external_links')) {
        await client.query(`ALTER TABLE "settings" ADD COLUMN "follow_external_links" boolean NOT NULL DEFAULT false`);
        console.log('Added follow_external_links column');
      }
      
      if (!columns.includes('analyze_images')) {
        await client.query(`ALTER TABLE "settings" ADD COLUMN "analyze_images" boolean NOT NULL DEFAULT true`);
        console.log('Added analyze_images column');
      }
      
      if (!columns.includes('analyze_link_structure')) {
        await client.query(`ALTER TABLE "settings" ADD COLUMN "analyze_link_structure" boolean NOT NULL DEFAULT true`);
        console.log('Added analyze_link_structure column');
      }
      
      if (!columns.includes('use_ai')) {
        await client.query(`ALTER TABLE "settings" ADD COLUMN "use_ai" boolean NOT NULL DEFAULT true`);
        console.log('Added use_ai column');
      }
    }
    
    // Create analyses table if it doesn't exist
    const checkAnalysesTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'analyses'
      )
    `);
    
    if (!checkAnalysesTable.rows[0].exists) {
      console.log('Creating analyses table...');
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
        )
      `);
      console.log('Created analyses table');
    }
    
    console.log('Database tables fixed successfully');
  } catch (error) {
    console.error('Error fixing database tables:', error);
  } finally {
    client.release();
  }
}

fixSettingsTable()
  .then(() => {
    console.log('Database fix process finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database fix process failed:', error);
    process.exit(1);
  });