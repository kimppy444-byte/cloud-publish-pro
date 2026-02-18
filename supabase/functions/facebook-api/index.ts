import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH_API = 'https://graph.facebook.com/v19.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FACEBOOK_API_KEY = Deno.env.get('FACEBOOK_API_KEY');
    if (!FACEBOOK_API_KEY) {
      throw new Error('FACEBOOK_API_KEY is not configured');
    }

    const { action, pageId, igAccountId } = await req.json();

    let data: unknown;

    switch (action) {
      case 'get_pages': {
        // Get all Facebook pages the user manages
        const res = await fetch(
          `${GRAPH_API}/me/accounts?fields=id,name,access_token,picture,fan_count,category&access_token=${FACEBOOK_API_KEY}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_page_videos': {
        if (!pageId) throw new Error('pageId is required');
        const res = await fetch(
          `${GRAPH_API}/${pageId}/videos?fields=id,title,description,length,created_time,views,likes.summary(true),comments.summary(true),thumbnails&limit=25&access_token=${FACEBOOK_API_KEY}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_page_insights': {
        if (!pageId) throw new Error('pageId is required');
        const res = await fetch(
          `${GRAPH_API}/${pageId}?fields=id,name,fan_count,followers_count,engagement,picture&access_token=${FACEBOOK_API_KEY}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_instagram_account': {
        if (!pageId) throw new Error('pageId is required');
        const res = await fetch(
          `${GRAPH_API}/${pageId}?fields=instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}&access_token=${FACEBOOK_API_KEY}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_instagram_media': {
        if (!igAccountId) throw new Error('igAccountId is required');
        const res = await fetch(
          `${GRAPH_API}/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=25&access_token=${FACEBOOK_API_KEY}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_user_info': {
        const res = await fetch(
          `${GRAPH_API}/me?fields=id,name,email&access_token=${FACEBOOK_API_KEY}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Facebook API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
