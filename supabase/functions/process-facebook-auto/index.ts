import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GRAPH_API = 'https://graph.facebook.com/v19.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active auto posts that are due
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
          let descriptionWithHashtags = post.description;
          if (post.hashtags) {
            descriptionWithHashtags += '\n\n' + post.hashtags;
          }

          let result: any;

          if (post.post_type === 'video' && post.video_url) {
            // Publish video to Facebook page
            const params = new URLSearchParams({
              file_url: post.video_url,
              access_token: post.page_access_token,
            });
            if (post.title) params.set('title', post.title);
            if (descriptionWithHashtags) params.set('description', descriptionWithHashtags);

            const res = await fetch(`${GRAPH_API}/${post.page_id}/videos`, {
              method: 'POST',
              body: params,
            });
            result = await res.json();
            if (!res.ok) throw new Error(`Facebook video error [${res.status}]: ${JSON.stringify(result)}`);
          } else {
            // Publish text/link post to Facebook page
            const params = new URLSearchParams({
              message: descriptionWithHashtags,
              access_token: post.page_access_token,
            });

            const res = await fetch(`${GRAPH_API}/${post.page_id}/feed`, {
              method: 'POST',
              body: params,
            });
            result = await res.json();
            if (!res.ok) throw new Error(`Facebook post error [${res.status}]: ${JSON.stringify(result)}`);
          }

          postResults.push(result);
          console.log(`Posted ${p + 1}/${post.posts_per_interval} for fb auto-post ${post.id}`);
        }

        // Increment counter by 1 (not by posts_per_interval)
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
