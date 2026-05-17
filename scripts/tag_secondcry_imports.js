import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
(async()=>{
  try{
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const SECOND_DIR = path.resolve(__dirname, '../second cry/Sample data');
    const { createClient } = (await import('@supabase/supabase-js'));
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!SUPABASE_URL || !SUPABASE_KEY){ console.error('Supabase env not set'); process.exit(1); }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    if(!fs.existsSync(SECOND_DIR)){
      console.error('SecondCry source dir not found:', SECOND_DIR);
      process.exit(1);
    }

    function collectFiles(dir){
      const out = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for(const e of entries){
        const full = path.join(dir, e.name);
        if(e.isDirectory()) out.push(...collectFiles(full));
        else out.push(full);
      }
      return out;
    }
    const files = collectFiles(SECOND_DIR).map(f=>path.basename(f));
    console.log('Found', files.length, 'files to mark as secondcry');

    // find raw rows with filename or source_file matching
    const { data: rawMatches, error: rawErr } = await supabase.from('firstcry_raw_files').select('id, filename, source_file').in('filename', files);
    if(rawErr) throw rawErr;
    console.log('Raw rows with matching filename:', rawMatches.length);

    // also match by source_file
    const { data: rawMatches2 } = await supabase.from('firstcry_raw_files').select('id, filename, source_file').in('source_file', files);
    const allRawIds = new Set((rawMatches||[]).concat(rawMatches2||[]).map(r=>r.id));

    console.log('Total raw ids matched (unique):', allRawIds.size);

    // update firstcry_raw_files portal if column exists
    if(allRawIds.size>0){
      const ids = Array.from(allRawIds);
      const { error: updErr } = await supabase.from('firstcry_raw_files').update({ portal: 'second' }).in('id', ids);
      if(updErr) console.warn('Could not update firstcry_raw_files portal:', updErr.message);
      else console.log('Updated portal on firstcry_raw_files for', ids.length, 'rows');

      // Now update orders where order_number like 'raw-<id>-...'
      const { data: orders } = await supabase.from('orders').select('id,order_number').ilike('order_number','raw-%').limit(10000);
      let updatedOrders = 0;
      for(const o of orders||[]){
        const m = String(o.order_number).match(/^raw-(\d+)-/i);
        if(!m) continue;
        const rawId = Number(m[1]);
        if(allRawIds.has(rawId)){
          const { error: oe } = await supabase.from('orders').update({ portal: 'second' }).eq('id', o.id);
          if(oe) console.warn('Failed updating order', o.id, oe.message);
          else updatedOrders++;
        }
      }
      console.log('Updated', updatedOrders, 'orders to portal=second');
    } else {
      console.log('No raw rows matched by filename/source_file. Trying heuristic by created_at recent import window.');
      // fallback: find last 3000 inserted raw rows by created_at within last 24 hours
      const { data: recent } = await supabase.from('firstcry_raw_files').select('id, filename, source_file, created_at').order('created_at',{ascending:false}).limit(3000);
      const recentIds = recent ? recent.map(r=>r.id) : [];
      if(recentIds.length===0){ console.log('No recent raw rows found'); process.exit(0); }
      const { error: updErr } = await supabase.from('firstcry_raw_files').update({ portal: 'second' }).in('id', recentIds);
      if(updErr) console.warn('Could not update recent raw rows:', updErr.message);
      else console.log('Marked', recentIds.length, 'recent raw rows as portal=second');
      // update orders similarly
      const { data: orders } = await supabase.from('orders').select('id,order_number').ilike('order_number','raw-%').limit(20000);
      let updatedOrders = 0;
      for(const o of orders||[]){
        const m = String(o.order_number).match(/^raw-(\d+)-/i);
        if(!m) continue;
        const rawId = Number(m[1]);
        if(recentIds.includes(rawId)){
          const { error: oe } = await supabase.from('orders').update({ portal: 'second' }).eq('id', o.id);
          if(oe) console.warn('Failed updating order', o.id, oe.message);
          else updatedOrders++;
        }
      }
      console.log('Updated', updatedOrders, 'orders to portal=second (heuristic recent)');
    }

    console.log('Done.');
    process.exit(0);
  }catch(e){ console.error('Error', e && e.message ? e.message : e); process.exit(1); }
})();
