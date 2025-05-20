import pg from 'pg';
const { Pool } = pg;

async function addCompetitorAnalysisColumn() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Adding competitor_analysis column to analyses table...');
    
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'analyses' AND column_name = 'competitor_analysis'
    `);
    
    if (checkResult.rows.length === 0) {
      // Column doesn't exist, add it
      await pool.query(`
        ALTER TABLE analyses 
        ADD COLUMN competitor_analysis JSONB
      `);
      console.log('Successfully added competitor_analysis column!');
    } else {
      console.log('competitor_analysis column already exists.');
    }
    
  } catch (error) {
    console.error('Error adding competitor_analysis column:', error);
  } finally {
    await pool.end();
  }
}

addCompetitorAnalysisColumn().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});