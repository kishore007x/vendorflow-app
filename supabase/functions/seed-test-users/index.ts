import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const testUsers = [
    { email: "admin@vendorpro.com", password: "admin123", name: "Admin User", role: "admin" },
    { email: "vendor@vendorpro.com", password: "vendor123", name: "Vendor User", role: "vendor" },
    { email: "ops@vendorpro.com", password: "ops123", name: "Operations User", role: "operations" },
  ];

  const results = [];

  for (const u of testUsers) {
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name },
    });

    if (authError) {
      // User might already exist
      if (authError.message?.includes("already been registered")) {
        results.push({ email: u.email, status: "already exists" });
        continue;
      }
      results.push({ email: u.email, status: "error", message: authError.message });
      continue;
    }

    const userId = authData.user.id;

    // Update role from default 'vendor' to the target role
    if (u.role !== "vendor") {
      await supabaseAdmin.from("user_roles").update({ role: u.role }).eq("user_id", userId);
    }

    results.push({ email: u.email, role: u.role, status: "created" });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
