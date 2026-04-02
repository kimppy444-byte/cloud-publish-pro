import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GRAPH_API = 'https://graph.facebook.com/v19.0';

async function generateVariation(originalText: string, hashtags: string | null, platform: string, postNumber: number, maxPosts: number, apiKey: string): Promise<{ text: string; hashtags: string }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Facebook growth expert writing posts that drive COMMENTS and ENGAGEMENT. Facebook's 2026 algorithm weights comments (especially 50+ character replies) FAR higher than likes — quality conversations extend reach massively. This is variation ${postNumber}/${maxPosts} in a series.

TONE & STYLE:
- Write like a REAL PERSON, not a bot or marketer
- Natural, conversational, relatable — like you're talking to friends
- Light hook, question, or relatable statement to open
- Do NOT use overly aggressive or spammy hooks like "This is broken!" or "Hurry!"
- Do NOT sound robotic or use Pinterest-style SEO titles

FORMAT (follow this structure):
Line 1: Relatable hook or question (draw people in)
Lines 2-3: Explain what it does — focus on benefits (faster grinding, easier gameplay, time saved)
Line 4: Soft call to action (not pushy)
Line 5: Question to boost comments (ask opinions, preferences, experiences)

RULES:
- Keep the same core topic/message but use COMPLETELY different wording, angle, and hook each time
- NO external links — Facebook penalizes them (98% of viewed posts have no links)
- Say "Link in bio" or "Check the bio" instead of posting URLs
- Use 2-5 hashtags MAX (more than 7 causes 27% reach drop)
- Keep it readable — not too short, not too long
- Focus on BENEFITS not features
- End with a question to encourage replies
- Each variation MUST have a different opening hook and angle

GOOD EXAMPLE:
"Anyone here still playing State of Anarchy?\\n\\nI found a script with ESP, Loot Teleport, and Kill All that makes farming way faster and easier. Works really well on Extra Stashes too.\\n\\nLink's in the bio if you want it\\n\\nYou guys using scripts or playing legit?"

BAD EXAMPLE (don't do this):
"This script is broken\\nESP + Kill All + Teleport" (too aggressive, spam)
"Roblox Script (ESP, Auto Farm, No Key) Working 2026" (robotic, SEO-style)

Return ONLY a JSON object: {"text": "the post text without hashtags", "hashtags": "#tag1 #tag2 #tag3"}
Do NOT include hashtags in the text field — put them separately.`
          },
          { role: "user", content: `Original post: ${originalText}\nOriginal hashtags: ${hashtags || 'none'}` }
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`AI variation failed (${response.status}), using original text`);
      return { text: originalText, hashtags: hashtags || '' };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '';
    
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { text: parsed.text || originalText, hashtags: parsed.hashtags || hashtags || '' };
    } catch {
      return { text: rawContent || originalText, hashtags: hashtags || '' };
    }
  } catch (err) {
    console.warn('AI variation error, using original:', err);
    return { text: originalText, hashtags: hashtags || '' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: duePosts, error: fetchError } = await supabase
      .from('facebook_auto_posts')
      .select('*')
      .eq('status', 'active')
      .lte('next_post_at', new Date().toISOString());

    if (fetchError) throw fetchError;
    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No Facebook posts due' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    for (const post of duePosts) {
      try {
        const postResults: any[] = [];

        for (let p = 0; p < post.posts_per_interval; p++) {
          // Generate unique AI variation
          let finalText: string;
          let finalHashtags: string;

          if (lovableApiKey) {
            const variation = await generateVariation(
              post.description,
              post.hashtags,
              'facebook',
              post.current_count + 1,
              post.max_posts,
              lovableApiKey
            );
            finalText = variation.text;
            finalHashtags = variation.hashtags;
          } else {
            finalText = post.description;
            finalHashtags = post.hashtags || '';
          }

          const fullMessage = finalHashtags ? `${finalText}\n\n${finalHashtags}` : finalText;

          let result: any;

          if (post.post_type === 'video' && post.video_url) {
            const params = new URLSearchParams({
              file_url: post.video_url,
              access_token: post.page_access_token,
            });
            if (post.title) params.set('title', post.title);
            if (fullMessage) params.set('description', fullMessage);

            const res = await fetch(`${GRAPH_API}/${post.page_id}/videos`, {
              method: 'POST',
              body: params,
            });
            result = await res.json();
            if (!res.ok) throw new Error(`Facebook video error [${res.status}]: ${JSON.stringify(result)}`);
          } else {
            const params = new URLSearchParams({
              message: fullMessage,
              access_token: post.page_access_token,
            });

            const res = await fetch(`${GRAPH_API}/${post.page_id}/feed`, {
              method: 'POST',
              body: params,
            });
            result = await res.json();
            if (!res.ok) throw new Error(`Facebook post error [${res.status}]: ${JSON.stringify(result)}`);
          }

          postResults.push({ ...result, posted_text: fullMessage });
          console.log(`Posted ${p + 1}/${post.posts_per_interval} for fb auto-post ${post.id}`);
        }

        const newCount = post.current_count + 1;
        const nextPostAt = new Date(Date.now() + post.interval_hours * 60 * 60 * 1000);

        if (newCount >= post.max_posts) {
          await supabase.from('facebook_auto_posts').update({
            current_count: newCount,
            status: 'completed',
            last_result: postResults,
          }).eq('id', post.id);
        } else {
          await supabase.from('facebook_auto_posts').update({
            current_count: newCount,
            next_post_at: nextPostAt.toISOString(),
            last_result: postResults,
          }).eq('id', post.id);
        }

        results.push({ id: post.id, success: true, count: `${newCount}/${post.max_posts}` });
      } catch (err: any) {
        console.error(`FB auto-post ${post.id} failed:`, err);
        await supabase.from('facebook_auto_posts').update({
          last_result: { error: err.message },
        }).eq('id', post.id);
        results.push({ id: post.id, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Process facebook auto error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
