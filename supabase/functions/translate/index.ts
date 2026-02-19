import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Translation edge function using MyMemory API (free, no API key required)
 * Integrates route-5.ts translation logic as a Supabase edge function.
 * 
 * POST body: { text: string, targetLanguage: string, sourceLanguage?: string }
 * Supports: en, es, fr, de, it, pt, zh, ja, ko, ar, ru, hi, and many more
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const err = (msg: string, status = 400) => new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (req.method !== 'POST') return err('Method not allowed', 405);

    const { text, targetLanguage, sourceLanguage = 'en' } = await req.json();

    if (!text || !targetLanguage) {
      return err('Missing required fields: text and targetLanguage');
    }

    if (text.length > 5000) {
      return err('Text too long. Maximum 5000 characters per request.');
    }

    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|${targetLanguage}`;

    const response = await fetch(myMemoryUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MyMemory API error:', errorText);
      return err('Translation service unavailable', 502);
    }

    const data = await response.json();

    if (data.responseStatus !== 200) {
      return err(data.responseDetails || 'Translation failed', 400);
    }

    const translatedText = data.responseData.translatedText;
    const quality = data.responseData.match; // 0-1 confidence score

    return ok({
      success: true,
      translatedText,
      sourceLanguage,
      targetLanguage,
      quality,
    });
  } catch (error: unknown) {
    console.error('Translation error:', error);
    return err(error instanceof Error ? error.message : 'Translation failed', 500);
  }
});
