import { pool } from './server/db';

async function fixSettingsColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Starting settings columns fix...');

    // Check for missing columns in our schema validation
    const missingColumnsQuery = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'analyze_page_speed'
      )
    `);
    
    if (!missingColumnsQuery.rows[0].exists) {
      console.log('Adding missing settings columns...');
      
      // Add missing columns to match the schema
      await client.query(`
        ALTER TABLE "settings" 
        ADD COLUMN IF NOT EXISTS "analyze_page_speed" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "analyze_structured_data" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "analyze_mobile_compatibility" boolean NOT NULL DEFAULT true
      `);
      
      console.log('Added missing columns to the settings table');
    } else {
      console.log('All required settings columns exist');
    }
    
    console.log('Settings columns fix completed');
  } catch (error) {
    console.error('Error fixing settings columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

fixSettingsColumns()
  .then(() => {
    console.log('Settings columns fix process finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Settings columns fix process failed:', error);
    process.exit(1);
  });