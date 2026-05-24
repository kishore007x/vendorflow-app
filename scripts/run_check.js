import fs from 'fs';

const envRaw = fs.existsSync('./.env') ? fs.readFileSync('./.env','utf8') : '';
const env = envRaw.split(/\r?\n/).reduce((acc,line)=>{
  const m=line.match(/^([^=]+)=(.*)$/);
  if(m){
    const key = m[1].trim();
    let val = m[2] === undefined ? '' : m[2].trim();
    val = val.replace(/^\"|\"$/g, '');
    val = val.replace(/^\'+|\'+$/g, '');
    acc[key] = val;
  }
  return acc;
},{});

process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

import('./check_required_tables.js');
