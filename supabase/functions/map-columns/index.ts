import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { headers, sampleRows, moduleFields } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a data mapping assistant. Given Excel column headers and sample data, map them to system fields.

Rules:
- Match by semantic meaning, not exact name match
- Consider common abbreviations (qty=quantity, amt=amount, etc.)
- Return confidence score 0-1 for each mapping
- If no good match, set systemField to null
- Consider the sample data to improve accuracy`;

    const userPrompt = `Map these Excel headers to system fields.

Excel Headers: ${JSON.stringify(headers)}
Sample Data (first 3 rows): ${JSON.stringify(sampleRows?.slice(0, 3))}

Available System Fields:
${JSON.stringify(moduleFields)}

Return a JSON array with this exact structure:
[{"excelHeader": "...", "systemField": "field_key or null", "confidence": 0.0-1.0, "reason": "brief explanation"}]

Only return the JSON array, nothing else.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "map_columns",
              description: "Map Excel columns to system fields",
              parameters: {
                type: "object",
                properties: {
                  mappings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        excelHeader: { type: "string" },
                        systemField: { type: "string", nullable: true },
                        confidence: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["excelHeader", "systemField", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["mappings"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "map_columns" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again." }), {
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let mappings = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      mappings = parsed.mappings || [];
    } else {
      // Fallback: try parsing from content
      const content = data.choices?.[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) mappings = JSON.parse(jsonMatch[0]);
    }

    return new Response(JSON.stringify({ mappings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("map-columns error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
