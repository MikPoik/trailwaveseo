import { Pool } from '@neondatabase/serverless';
import { db } from './server/db';

async function updateSettingsTable() {
  console.log('Starting settings table update...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Check if new columns exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      AND column_name IN ('analyze_page_speed', 'analyze_structured_data', 'analyze_mobile_compatibility')
    `);

    // If columns don't exist, add them
    if (checkResult.rows.length < 3) {
      console.log('Adding missing columns to settings table...');
      
      // Try to add each column individually to handle cases where some might exist
      try {
        await pool.query(`
          ALTER TABLE settings
          ADD COLUMN IF NOT EXISTS analyze_page_speed BOOLEAN NOT NULL DEFAULT true
        `);
        console.log('Added analyze_page_speed column');
      } catch (err) {
        console.error('Error adding analyze_page_speed column:', err);
      }

      try {
        await pool.query(`
          ALTER TABLE settings
          ADD COLUMN IF NOT EXISTS analyze_structured_data BOOLEAN NOT NULL DEFAULT true
        `);
        console.log('Added analyze_structured_data column');
      } catch (err) {
        console.error('Error adding analyze_structured_data column:', err);
      }

      try {
        await pool.query(`
          ALTER TABLE settings
          ADD COLUMN IF NOT EXISTS analyze_mobile_compatibility BOOLEAN NOT NULL DEFAULT true
        `);
        console.log('Added analyze_mobile_compatibility column');
      } catch (err) {
        console.error('Error adding analyze_mobile_compatibility column:', err);
      }
    } else {
      console.log('All required columns already exist');
    }

    console.log('Settings table update completed successfully');
  } catch (error) {
    console.error('Error updating settings table:', error);
  } finally {
    await pool.end();
  }
}

updateSettingsTable().catch(console.error);