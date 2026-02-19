import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Deterministic short code from URL (base36 hash) */
function generateCode(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32-bit int
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const err = (msg: string, status = 400) => new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);

    // GET /url-shortener?code=xxx → resolve
    if (req.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) return err('code is required');

      const { data, error } = await supabase
        .from('short_urls')
        .select('original_url')
        .eq('code', code)
        .maybeSingle();

      if (error || !data) return err('URL not found', 404);

      // Increment click count
      await supabase.from('short_urls').update({ click_count: supabase.rpc('increment', { row_id: data.id }) }).eq('code', code);

      return ok({ success: true, url: data.original_url });
    }

    // POST body: { url: string } → shorten
    if (req.method === 'POST') {
      const body = await req.json();
      const longUrl = body.url;
      if (!longUrl) return err('url is required');

      const code = generateCode(longUrl);

      // Upsert (same URL always gets same code)
      const { error: upsertErr } = await supabase
        .from('short_urls')
        .upsert({ code, original_url: longUrl }, { onConflict: 'code', ignoreDuplicates: false });

      if (upsertErr) {
        console.error('Upsert error:', upsertErr);
        return err('Failed to shorten URL', 500);
      }

      // Return short URL using the Supabase project URL as base for the redirect
      const projectId = Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0] || 'unknown';
      const shortUrl = `https://${projectId}.supabase.co/functions/v1/url-shortener?code=${code}`;

      return ok({ success: true, shortUrl, code, originalUrl: longUrl });
    }

    return err('Method not allowed', 405);
  } catch (error: unknown) {
    console.error('URL Shortener Error:', error);
    return err(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
