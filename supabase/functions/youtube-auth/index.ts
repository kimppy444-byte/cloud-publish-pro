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
    const { action, code, redirectUri } = await req.json();

    switch (action) {
      case 'validate': {
        // Pre-flight validation of OAuth configuration
        const issues: string[] = [];

        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.trim() === '') {
          issues.push('GOOGLE_CLIENT_ID is not set');
        } else if (!GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
          issues.push('GOOGLE_CLIENT_ID format appears invalid — it should end with ".apps.googleusercontent.com"');
        }

        if (!GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET.trim() === '') {
          issues.push('GOOGLE_CLIENT_SECRET is not set');
        } else if (GOOGLE_CLIENT_SECRET.length < 10) {
          issues.push('GOOGLE_CLIENT_SECRET appears too short — verify the value in your Google Cloud Console');
        }

        if (redirectUri) {
          // Check redirect URI matches expected pattern
          try {
            const url = new URL(redirectUri);
            if (!url.pathname.endsWith('/youtube-callback')) {
              issues.push(`Redirect URI path should end with "/youtube-callback" — got "${url.pathname}"`);
            }
          } catch {
            issues.push(`Redirect URI is not a valid URL: "${redirectUri}"`);
          }
        }

        return new Response(JSON.stringify({
          success: issues.length === 0,
          data: {
            valid: issues.length === 0,
            issues,
            clientIdConfigured: !!GOOGLE_CLIENT_ID,
            clientIdPrefix: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 8) + '...' : null,
            redirectUri: redirectUri || null,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
          // Provide user-friendly error messages for common OAuth errors
          const errorCode = tokens.error;
          const errorDesc = tokens.error_description || '';
          let friendlyMessage = `Google OAuth error: ${errorCode}`;

          if (errorCode === 'invalid_client') {
            friendlyMessage = 'Invalid OAuth credentials. Please verify your Google Client ID and Client Secret are correct in your project secrets. They must match the credentials in your Google Cloud Console.';
          } else if (errorCode === 'redirect_uri_mismatch') {
            friendlyMessage = `Redirect URI mismatch. The URI "${redirectUri}" is not registered in your Google Cloud Console. Go to APIs & Services → Credentials → your OAuth client → Authorized redirect URIs and add this exact URI.`;
          } else if (errorCode === 'invalid_grant') {
            friendlyMessage = 'Authorization code expired or already used. Please try connecting again.';
          }

          throw new Error(friendlyMessage);
        }

        // Get channel info
        const channelRes = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];

        // Delete existing tokens, store new ones
        await supabase.from('youtube_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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
          data: {
            channelId: channel?.id,
            channelTitle: channel?.snippet?.title,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_status': {
        const { data: row } = await supabase
          .from('youtube_tokens')
          .select('channel_id, channel_title')
          .limit(1)
          .maybeSingle();

        return new Response(JSON.stringify({
          success: true,
          data: {
            connected: !!row,
            channelId: row?.channel_id,
            channelTitle: row?.channel_title,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_token': {
        const { data: row } = await supabase
          .from('youtube_tokens')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!row) {
          return new Response(JSON.stringify({ success: false, error: 'No YouTube account connected' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let accessToken = row.access_token;
        const expiry = new Date(row.token_expiry);

        // Refresh if expired or about to expire (within 60s)
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
          if (!refreshRes.ok) throw new Error(`Token refresh failed: ${JSON.stringify(refreshData)}`);

          accessToken = refreshData.access_token;
          await supabase.from('youtube_tokens').update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          }).eq('id', row.id);
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            accessToken,
            channelId: row.channel_id,
            channelTitle: row.channel_title,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        await supabase.from('youtube_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
