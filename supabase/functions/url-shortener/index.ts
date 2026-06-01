import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const err = (msg: string, status = 400) => new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Use spoo.me first, then da.gd as fallback. Both are clean — no interstitials or random redirects.
async function trySpooMe(longUrl: string): Promise<string | null> {
  try {
    const form = new URLSearchParams();
    form.set('url', longUrl);
    const res = await fetch('https://spoo.me/', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.short_url || null;
  } catch { return null; }
}

async function tryDaGd(longUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`https://da.gd/s?url=${encodeURIComponent(longUrl)}`);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (text.startsWith('http')) return text;
    return null;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return err('Method not allowed', 405);
    const body = await req.json();
    const longUrl = body.url;
    if (!longUrl) return err('url is required');

    let shortUrl = await tryTinyUrl(longUrl);
    if (!shortUrl) shortUrl = await trySpooMe(longUrl);

    if (!shortUrl) {
      console.error('All shortener services failed for url:', longUrl);
      return err('URL shortener service unavailable', 502);
    }

    return ok({ success: true, shortUrl, originalUrl: longUrl });
  } catch (error: unknown) {
    console.error('URL Shortener Error:', error);
    return err(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
