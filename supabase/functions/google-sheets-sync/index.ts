import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, sheetUrl, targetModule, sheetName, exportData } = await req.json();

    if (action === "import") {
      // Import from a published/public Google Sheet via CSV export
      const sheetId = extractSheetId(sheetUrl);
      if (!sheetId) throw new Error("Invalid Google Sheets URL. Please use a valid sharing link.");

      const gid = sheetName || "0";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(
          "Could not access the sheet. Make sure it's shared as 'Anyone with the link can view'."
        );
      }

      const csvText = await response.text();
      const rows = csvText.split("\n").map((row) => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of row) {
          if (char === '"') { inQuotes = !inQuotes; continue; }
          if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
          current += char;
        }
        result.push(current.trim());
        return result;
      });

      if (rows.length < 2) throw new Error("Sheet appears to be empty or has no data rows.");

      const headers = rows[0];
      const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.length > 0));

      const records = dataRows.map((row) => {
        const record: Record<string, string> = {};
        headers.forEach((h, i) => {
          if (h && row[i] !== undefined) record[h] = row[i];
        });
        return record;
      });

      return new Response(
        JSON.stringify({
          success: true,
          headers,
          rowCount: records.length,
          sampleRows: records.slice(0, 5),
          allRows: records,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "export") {
      // Return data formatted for download/copy
      if (!exportData || !Array.isArray(exportData) || exportData.length === 0) {
        throw new Error("No data to export");
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(","),
        ...exportData.map((row: Record<string, unknown>) =>
          headers.map((h) => {
            const val = String(row[h] ?? "");
            return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
          }).join(",")
        ),
      ];

      return new Response(
        JSON.stringify({ success: true, csv: csvRows.join("\n"), rowCount: exportData.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("google-sheets-sync error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
