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

// Follow redirects (HEAD then GET fallback) and return the final resolved URL.
async function resolveRedirect(shortUrl: string): Promise<{ finalUrl: string | null; status: number; hops: number }> {
  let current = shortUrl;
  let hops = 0;
  let lastStatus = 0;
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(current, { method: 'GET', redirect: 'manual' });
      lastStatus = res.status;
      await res.body?.cancel();
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) break;
        current = new URL(loc, current).toString();
        hops++;
        continue;
      }
      break;
    } catch { break; }
  }
  return { finalUrl: current, status: lastStatus, hops };
}

function urlsMatch(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin === ub.origin && ua.pathname === ub.pathname && ua.search === ub.search;
  } catch { return a === b; }
}

async function healthCheck(testUrl: string) {
  const targetUrl = testUrl || 'https://cloud-publish-pro.lovable.app/u/healthcheck?d=test';
  const providers: Array<{ name: string; fn: (u: string) => Promise<string | null> }> = [
    { name: 'spoo.me', fn: trySpooMe },
    { name: 'da.gd', fn: tryDaGd },
  ];
  const results = [];
  for (const p of providers) {
    const start = Date.now();
    const short = await p.fn(targetUrl);
    if (!short) {
      results.push({ provider: p.name, ok: false, error: 'failed to create short link', latencyMs: Date.now() - start });
      continue;
    }
    const resolved = await resolveRedirect(short);
    const matches = resolved.finalUrl ? urlsMatch(resolved.finalUrl, targetUrl) : false;
    results.push({
      provider: p.name,
      ok: matches,
      shortUrl: short,
      finalUrl: resolved.finalUrl,
      hops: resolved.hops,
      finalStatus: resolved.status,
      matchesTarget: matches,
      latencyMs: Date.now() - start,
    });
  }
  const healthy = results.filter(r => r.ok).map(r => r.provider);
  return { success: true, healthy, results, targetUrl };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);

    // GET /url-shortener?health=1[&url=...] OR POST {"action":"healthcheck","url":"..."}
    if (req.method === 'GET' && url.searchParams.get('health')) {
      const testUrl = url.searchParams.get('url') || '';
      return ok(await healthCheck(testUrl));
    }

    if (req.method !== 'POST') return err('Method not allowed', 405);
    const body = await req.json().catch(() => ({}));

    if (body.action === 'healthcheck') {
      return ok(await healthCheck(body.url || ''));
    }

    const longUrl = body.url;
    if (!longUrl) return err('url is required');

    let shortUrl = await trySpooMe(longUrl);
    let provider = 'spoo.me';
    if (!shortUrl) { shortUrl = await tryDaGd(longUrl); provider = 'da.gd'; }

    if (!shortUrl) {
      console.error('All shortener services failed for url:', longUrl);
      return err('URL shortener service unavailable', 502);
    }

    return ok({ success: true, shortUrl, originalUrl: longUrl, provider });
  } catch (error: unknown) {
    console.error('URL Shortener Error:', error);
    return err(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
