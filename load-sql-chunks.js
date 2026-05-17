import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

const dbUrl = process.env.SUPABASE_CONNECTION_STRING;

if (!dbUrl) {
  throw new Error('Missing SUPABASE_CONNECTION_STRING');
}

async function loadSqlChunks() {
  const client = new Client({ connectionString: dbUrl });
  
  try {
    await client.connect();
    console.log('Connected to Supabase database');
    
    const chunksDir = path.join(process.cwd(), 'sql-chunks');
    
    if (!fs.existsSync(chunksDir)) {
      console.error(`ERROR: sql-chunks directory not found at ${chunksDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(chunksDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} SQL chunk files to load\n`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(chunksDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        
        console.log(`Loading ${file}...`);
        
        // Execute the full SQL statement
        const result = await client.query(sql);
        successCount++;
        console.log(`✓ ${file} loaded successfully (${result.rowCount || 0} rows affected)\n`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error loading ${file}:`);
        console.error(`  ${error.message}\n`);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total files: ${files.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

loadSqlChunks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
