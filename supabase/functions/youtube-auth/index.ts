import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { action, code, redirectUri, channelTokenId } = await req.json();

    switch (action) {
      case 'validate': {
        const issues: string[] = [];
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.trim() === '') {
          issues.push('GOOGLE_CLIENT_ID is not set');
        } else if (!GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
          issues.push('GOOGLE_CLIENT_ID format appears invalid');
        }
        if (!GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET.trim() === '') {
          issues.push('GOOGLE_CLIENT_SECRET is not set');
        }
        if (redirectUri) {
          try {
            const url = new URL(redirectUri);
            if (!url.pathname.endsWith('/youtube-callback')) {
              issues.push(`Redirect URI path should end with "/youtube-callback"`);
            }
          } catch {
            issues.push(`Redirect URI is not a valid URL`);
          }
        }
        return new Response(JSON.stringify({
          success: issues.length === 0,
          data: { valid: issues.length === 0, issues, clientIdConfigured: !!GOOGLE_CLIENT_ID, redirectUri }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_auth_url': {
        if (!redirectUri) throw new Error('redirectUri is required');
        const scopes = [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/youtube',
        ];
        const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent(scopes.join(' '))}` +
          `&access_type=offline` +
          `&prompt=consent`;

        return new Response(JSON.stringify({ success: true, data: { url } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'exchange_code': {
        if (!code || !redirectUri) throw new Error('code and redirectUri are required');

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        const tokens = await tokenRes.json();
        if (!tokenRes.ok) {
          const errorCode = tokens.error;
          let friendlyMessage = `Google OAuth error: ${errorCode}`;
          if (errorCode === 'invalid_client') {
            friendlyMessage = 'Invalid OAuth credentials. Verify your Google Client ID and Secret.';
          } else if (errorCode === 'redirect_uri_mismatch') {
            friendlyMessage = `Redirect URI mismatch. Add "${redirectUri}" to your Google Cloud Console.`;
          } else if (errorCode === 'invalid_grant') {
            friendlyMessage = 'Authorization code expired. Please try connecting again.';
          }
          throw new Error(friendlyMessage);
        }

        // Get channel info
        const channelRes = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];

        // Check if this channel is already connected
        if (channel?.id) {
          const { data: existing } = await supabase
            .from('youtube_tokens')
            .select('id')
            .eq('channel_id', channel.id)
            .maybeSingle();

          if (existing) {
            // Update existing token
            await supabase.from('youtube_tokens').update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || existing.refresh_token,
              token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              channel_title: channel.snippet?.title || null,
            }).eq('id', existing.id);

            return new Response(JSON.stringify({
              success: true,
              data: { channelId: channel.id, channelTitle: channel.snippet?.title, updated: true }
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }

        // Insert new channel token
        const { error: insertError } = await supabase.from('youtube_tokens').insert({
          channel_id: channel?.id || null,
          channel_title: channel?.snippet?.title || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        });

        if (insertError) throw new Error(`Failed to store tokens: ${insertError.message}`);

        return new Response(JSON.stringify({
          success: true,
          data: { channelId: channel?.id, channelTitle: channel?.snippet?.title }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_status': {
        // Returns true if ANY channel is connected
        const { data: rows } = await supabase
          .from('youtube_tokens')
          .select('id, channel_id, channel_title')
          .limit(10);

        const channels = rows || [];
        return new Response(JSON.stringify({
          success: true,
          data: {
            connected: channels.length > 0,
            channelCount: channels.length,
            channels: channels.map(r => ({ id: r.id, channelId: r.channel_id, channelTitle: r.channel_title })),
            // Backward compat
            channelId: channels[0]?.channel_id,
            channelTitle: channels[0]?.channel_title,
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_channels': {
        const { data: rows } = await supabase
          .from('youtube_tokens')
          .select('id, channel_id, channel_title, created_at');

        return new Response(JSON.stringify({
          success: true,
          data: { channels: (rows || []).map(r => ({ id: r.id, channelId: r.channel_id, channelTitle: r.channel_title, createdAt: r.created_at })) }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_channel_analytics': {
        if (!channelTokenId) throw new Error('channelTokenId is required');

        const { data: row } = await supabase
          .from('youtube_tokens')
          .select('*')
          .eq('id', channelTokenId)
          .maybeSingle();

        if (!row) throw new Error('Channel not found');

        let accessToken = row.access_token;
        const expiry = new Date(row.token_expiry);

        // Refresh if needed
        if (expiry < new Date(Date.now() + 60000)) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              refresh_token: row.refresh_token,
              grant_type: 'refresh_token',
            }),
          });
          const refreshData = await refreshRes.json();
          if (!refreshRes.ok) throw new Error('Token refresh failed');
          accessToken = refreshData.access_token;
          await supabase.from('youtube_tokens').update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          }).eq('id', row.id);
        }

        // Get channel stats
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${row.channel_id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];

        // Get recent videos
        const videosRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${row.channel_id}&order=date&maxResults=10&type=video`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const videosData = await videosRes.json();
        const videoIds = (videosData.items || []).map((v: any) => v.id?.videoId).filter(Boolean).join(',');

        let videos: any[] = [];
        if (videoIds) {
          const statsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const statsData = await statsRes.json();
          videos = (statsData.items || []).map((v: any) => ({
            id: v.id,
            title: v.snippet?.title,
            thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
            publishedAt: v.snippet?.publishedAt,
            viewCount: parseInt(v.statistics?.viewCount || '0'),
            likeCount: parseInt(v.statistics?.likeCount || '0'),
            commentCount: parseInt(v.statistics?.commentCount || '0'),
            duration: v.contentDetails?.duration,
          }));
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            channel: {
              id: channel?.id,
              title: channel?.snippet?.title,
              thumbnail: channel?.snippet?.thumbnails?.default?.url,
              subscriberCount: parseInt(channel?.statistics?.subscriberCount || '0'),
              videoCount: parseInt(channel?.statistics?.videoCount || '0'),
              viewCount: parseInt(channel?.statistics?.viewCount || '0'),
            },
            videos,
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_token': {
        // For upload - accepts optional channelTokenId to pick which channel
        const query = channelTokenId
          ? supabase.from('youtube_tokens').select('*').eq('id', channelTokenId).maybeSingle()
          : supabase.from('youtube_tokens').select('*').limit(1).maybeSingle();

        const { data: row } = await query;

        if (!row) {
          return new Response(JSON.stringify({ success: false, error: 'No YouTube account connected' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let accessToken = row.access_token;
        const expiry = new Date(row.token_expiry);

        if (expiry < new Date(Date.now() + 60000)) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              refresh_token: row.refresh_token,
              grant_type: 'refresh_token',
            }),
          });
          const refreshData = await refreshRes.json();
          if (!refreshRes.ok) throw new Error('Token refresh failed');
          accessToken = refreshData.access_token;
          await supabase.from('youtube_tokens').update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          }).eq('id', row.id);
        }

        return new Response(JSON.stringify({
          success: true,
          data: { accessToken, channelId: row.channel_id, channelTitle: row.channel_title }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'disconnect': {
        if (channelTokenId) {
          // Disconnect specific channel
          await supabase.from('youtube_tokens').delete().eq('id', channelTokenId);
        } else {
          // Disconnect all
          await supabase.from('youtube_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('YouTube Auth Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
