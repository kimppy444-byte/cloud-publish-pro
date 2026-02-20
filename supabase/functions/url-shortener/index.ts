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

    // Use cleanuri.com API — free, no key required
    const res = await fetch('https://cleanuri.com/api/v1/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('cleanuri.com error:', res.status, text);
      return err('URL shortener service unavailable', 502);
    }

    const data = await res.json();
    const shortUrl = data.result_url;
    if (!shortUrl) {
      console.error('cleanuri.com unexpected response:', JSON.stringify(data));
      return err('Failed to shorten URL', 500);
    }

    return ok({ success: true, shortUrl, originalUrl: longUrl });
  } catch (error: unknown) {
    console.error('URL Shortener Error:', error);
    return err(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
