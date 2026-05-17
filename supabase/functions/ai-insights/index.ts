import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "smart-pricing") {
      systemPrompt = `You are a pricing optimization AI for an e-commerce vendor management platform. Analyze the product data provided and give actionable pricing recommendations. Consider:
- Competitive positioning across portals (Amazon, Flipkart, Meesho, etc.)
- Margin optimization
- Demand elasticity signals from order history
Return structured recommendations with specific price suggestions and reasoning.`;
      userPrompt = `Analyze this product data and provide pricing recommendations:\n${JSON.stringify(data, null, 2)}`;
    } else if (type === "demand-forecast") {
      systemPrompt = `You are a demand forecasting AI for an e-commerce vendor management platform. Based on historical order/inventory data, predict demand trends. Consider:
- Seasonal patterns
- Portal-specific trends
- Stock velocity and aging
- Restock urgency
Provide specific SKU-level forecasts with confidence levels.`;
      userPrompt = `Forecast demand based on this data:\n${JSON.stringify(data, null, 2)}`;
    } else if (type === "return-analysis") {
      systemPrompt = `You are a return analysis AI. Analyze return patterns and identify:
- Products with high return rates
- Common return reasons by category
- Preventive actions to reduce returns
- Portal-specific return trends
Provide actionable insights.`;
      userPrompt = `Analyze these return patterns:\n${JSON.stringify(data, null, 2)}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid insight type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "No insights generated.";

    return new Response(JSON.stringify({ insight: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
