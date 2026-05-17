# Import Firstcry files into Supabase

This script reads the files in the `Firstcry/` directory and inserts rows into the Supabase tables created by the schema.

Prerequisites
- Node 18+ and the repo dependencies installed. The root `package.json` already includes `xlsx` and `@supabase/supabase-js`.

Environment variables (required)
- `SUPABASE_URL` — your Supabase project URL (e.g. https://xyz.supabase.co)
- `SUPABASE_SERVICE_KEY` — your Supabase service_role key (keep secret)

Run

```bash
cd "c:/Kishore Projects/vendorflow-hub-main"
npm install
SUPABASE_URL="https://<your>.supabase.co" SUPABASE_SERVICE_KEY="<service-role-key>" node scripts/import_firstcry_to_supabase.js
```

Notes
- The script maps common filenames to the tables in the schema. Files with irregular/blank headers are stored in `firstcry_payment_advice` or `firstcry_raw_files`.
- If an insert fails, the script logs the error and continues with other files.
- Review the `firstcry_*` tables after running and enable Row Level Security and policies before exposing data to public/anon roles.
