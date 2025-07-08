
import { pool } from './server/db';

async function addSiteOverviewColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding site_overview column to analyses table...');
    
    // Add the new column
    await client.query(`
      ALTER TABLE analyses 
      ADD COLUMN IF NOT EXISTS site_overview JSONB;
    `);
    
    console.log('Successfully added site_overview column to analyses table');
    
  } catch (error) {
    console.error('Error adding site_overview column:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
addSiteOverviewColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
