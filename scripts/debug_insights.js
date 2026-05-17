#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!SUPABASE_KEY){ console.error('Missing SUPABASE env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{persistSession:false} });

(async()=>{
  const { data: orders, error } = await supabase.from('orders').select('*').eq('portal','firstcry').limit(50);
  if(error){ console.error(error); process.exit(1); }
  console.log('fetched orders:', (orders||[]).length);
  let total=0; let count=0;
  const byDay={};
  const now=new Date();
  for(let i=0;i<14;i++){ const d=new Date(now.getFullYear(), now.getMonth(), now.getDate()-(13-i)); byDay[d.toISOString().slice(0,10)]=0; }
  (orders||[]).forEach(o=>{
    const amt = o.totalAmount||o.total_amount||o.amount||0;
    total+=Number(amt||0);
    count++;
    const d=(o.order_date||'').slice(0,10);
    if(byDay[d]!==undefined) byDay[d]+=Number(amt||0);
  });
  console.log('total revenue sample:', total, 'orders:', count);
  console.log('daily sample:', byDay);
})();
