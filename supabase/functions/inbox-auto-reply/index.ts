import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, sender, channel, conversation_history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI customer support assistant for a multi-portal e-commerce business. Your job is to:

1. CLASSIFY the incoming message into one of these categories:
   - new_lead: Customer inquiring about products/pricing (qualify as "hot", "warm", or "cold")
   - order_status: Customer asking about their order delivery/tracking
   - complaint: Customer reporting an issue/problem
   - return: Customer wants to return/exchange a product
   - follow_up: Existing conversation continuation
   - ignore: Spam or irrelevant message

2. DETERMINE if you can handle this message automatically or if it needs human intervention.
   You CANNOT handle:
   - Angry/abusive customers
   - Complex complaints requiring investigation
   - Refund requests above standard policy
   - Messages you're not confident about (confidence < 0.6)

3. GENERATE an appropriate reply if you can handle it.

4. ASSESS lead qualification for new_lead category:
   - hot: Asking about specific product, ready to buy, mentioning quantity
   - warm: General inquiry, comparing options
   - cold: Just browsing, vague questions

Respond with structured output using the provided tool.`;

    const conversationContext = (conversation_history || [])
      .map((entry: any) => `${entry.role}: ${entry.message}`)
      .join("\n");

    const userPrompt = `Channel: ${channel}
Sender: ${sender}
${conversationContext ? `Previous conversation:\n${conversationContext}\n` : ""}
Latest message: ${message}

Classify this message, determine if AI can handle it, and generate a reply if appropriate.`;

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
              name: "classify_and_reply",
              description: "Classify the message, assess confidence, and optionally generate a reply.",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: ["new_lead", "order_status", "complaint", "return", "follow_up", "ignore"],
                    description: "Message category",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0 and 1",
                  },
                  can_handle: {
                    type: "boolean",
                    description: "Whether AI can handle this automatically",
                  },
                  escalation_reason: {
                    type: "string",
                    description: "If can_handle is false, explain why escalation is needed",
                  },
                  suggested_reply: {
                    type: "string",
                    description: "Generated reply to send to the customer",
                  },
                  lead_qualification: {
                    type: "string",
                    enum: ["hot", "warm", "cold", "not_a_lead"],
                    description: "Lead qualification level",
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "urgent"],
                    description: "Priority level for this message",
                  },
                  suggested_action: {
                    type: "string",
                    description: "Recommended next action (e.g., 'Send catalog', 'Check order #1234', 'Assign to returns team')",
                  },
                  sentiment: {
                    type: "string",
                    enum: ["positive", "neutral", "negative", "angry"],
                    description: "Customer sentiment",
                  },
                },
                required: ["category", "confidence", "can_handle", "suggested_reply", "lead_qualification", "priority", "sentiment"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_and_reply" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
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
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("inbox-auto-reply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
