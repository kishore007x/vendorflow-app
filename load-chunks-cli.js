#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const chunksDir = path.join(process.cwd(), 'sql-chunks');
const files = fs.readdirSync(chunksDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} SQL chunk files to load`);

let successCount = 0;
let errorCount = 0;

for (const file of files) {
  try {
    const filePath = path.join(chunksDir, file);
    console.log(`Loading ${file}...`);

    // Use supabase db sql to execute the file
    const command = `npx supabase db sql --file "${filePath}"`;
    execSync(command, { stdio: 'inherit' });

    successCount++;
    console.log(`✓ ${file} loaded successfully`);
  } catch (error) {
    errorCount++;
    console.error(`✗ Error loading ${file}:`, error.message);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Total files: ${files.length}`);
console.log(`Successful: ${successCount}`);
console.log(`Errors: ${errorCount}`);
