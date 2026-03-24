import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, content, platform } = await req.json();

    let systemPrompt = "";
    
    switch (action) {
      case 'suggest_hashtags':
        systemPrompt = `You are a social media expert. Given a video description or topic, suggest the best hashtags to maximize reach and engagement. Return ONLY a JSON object with this format: {"hashtags": ["#tag1", "#tag2", ...], "reasoning": "brief explanation"}. Suggest 10-20 hashtags mixing popular and niche ones. Platform: ${platform || 'all'}.`;
        break;
      
      case 'improve_description':
        systemPrompt = `You are a social media copywriting expert. Given a video description or topic, rewrite it to be more engaging and optimized for ${platform || 'social media'}. Return ONLY a JSON object: {"description": "improved text", "tips": ["tip1", "tip2"]}. Keep it concise but compelling.`;
        break;
      
      case 'suggest_tweet':
        systemPrompt = `You are a Twitter/X expert. Given a video topic or description, craft the perfect tweet (max 280 chars) to promote it. Return ONLY a JSON object: {"tweet": "tweet text with hashtags", "alternatives": ["alt1", "alt2"]}. Make it engaging and include 2-3 relevant hashtags.`;
        break;
      
      case 'best_posting_times':
        systemPrompt = `You are a social media analytics expert. Given a content niche/topic, suggest the best times to post for maximum engagement on ${platform || 'all platforms'}. Return ONLY a JSON object: {"times": [{"day": "Monday", "time": "9:00 AM EST", "reason": "why"}], "general_tips": ["tip1"]}.`;
        break;

      case 'improve_thread':
        systemPrompt = `You are a Threads (by Meta) growth expert. Your goal is to rewrite posts to MAXIMIZE reach, engagement, and follower growth on Threads.

Key Threads algorithm insights you MUST apply:
- Threads rewards POSITIVITY, conversation starters, and authentic voice. Penalizes negativity and overly promotional content.
- Short, punchy posts (under 50 words) perform best. Hook in the first line is critical.
- Questions, hot takes, relatable humor, and "reply bait" drive massive engagement.
- Threads uses TOPICS (one per post, tagged with #), NOT traditional hashtags. Suggest ONE relevant topic tag if appropriate.
- The algorithm favors posts that get early engagement (first 30 min), so make the opening irresistible.
- Links in posts get deprioritized by the algorithm — avoid them.
- Emoji usage should be minimal but strategic.

Return ONLY a JSON object: {"text": "the improved thread post", "topic": "#SuggestedTopic or null", "tips": ["tip1", "tip2"], "alternatives": ["alt version 1", "alt version 2"]}. 
Keep the post under 500 chars. Make it feel human, not AI-generated.`;
        break;

      case 'suggest_topic':
        systemPrompt = `You are a Threads (by Meta) expert. Threads uses TOPICS (tagged with #) instead of traditional hashtags. Each post can have ONE topic tag.

Given the content, suggest the best topic tags that will maximize discoverability on Threads. Pick topics that are:
- Actively trending or have high engagement
- Specific enough to reach the right audience but broad enough to have volume
- Relevant to the content

Return ONLY a JSON object: {"topics": ["#Topic1", "#Topic2", "#Topic3"], "recommended": "#BestTopic", "reasoning": "why this topic is best"}.
Suggest 5-8 topic options.`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content || "gaming video" },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from the response (strip markdown code blocks if present)
    let parsed;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: rawContent };
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("AI suggest error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
