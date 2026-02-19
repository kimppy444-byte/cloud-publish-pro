import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const err = (msg: string, status = 400) => new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (req.method !== 'POST') return err('Method not allowed', 405);

    const body = await req.json();
    const longUrl = body.url;
    if (!longUrl) return err('url is required');

    // Use ulvis.net free API — no key required, private=1 keeps it unlisted
    const apiUrl = `https://ulvis.net/API/write/get?url=${encodeURIComponent(longUrl)}&private=1&type=json`;

    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'CloudPublishPro/1.0' },
    });

    if (!res.ok) {
      console.error('ulvis.net error:', res.status, await res.text());
      return err('URL shortener service unavailable', 502);
    }

    const data = await res.json();

    if (!data.success) {
      console.error('ulvis.net failure:', data);
      return err(data.error?.msg || 'Failed to shorten URL', 500);
    }

    const shortUrl = data.data?.url;
    if (!shortUrl) return err('No short URL in response', 500);

    return ok({ success: true, shortUrl, originalUrl: longUrl });
  } catch (error: unknown) {
    console.error('URL Shortener Error:', error);
    return err(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});

