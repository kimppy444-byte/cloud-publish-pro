import { supabase } from "@/integrations/supabase/client";

interface AiSuggestResponse {
  success: boolean;
  data?: any;
  error?: string;
}

async function callAiSuggest(body: Record<string, any>): Promise<AiSuggestResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-suggest', { body });
    if (error) {
      const context = (error as any)?.context;
      if (context && typeof context === 'object') {
        try {
          const b = await context.json?.();
          if (b?.error) return { success: false, error: b.error };
        } catch {}
      }
      return { success: false, error: error.message };
    }
    return data as AiSuggestResponse;
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function suggestHashtags(content: string, platform?: string) {
  return callAiSuggest({ action: 'suggest_hashtags', content, platform });
}

export async function improveDescription(content: string, platform?: string) {
  return callAiSuggest({ action: 'improve_description', content, platform });
}

export async function suggestTweet(content: string) {
  return callAiSuggest({ action: 'suggest_tweet', content, platform: 'twitter' });
}

export async function suggestBestTimes(content: string, platform?: string) {
  return callAiSuggest({ action: 'best_posting_times', content, platform });
}

export async function improveThread(content: string) {
  return callAiSuggest({ action: 'improve_thread', content, platform: 'threads' });
}

export async function suggestTopic(content: string) {
  return callAiSuggest({ action: 'suggest_topic', content, platform: 'threads' });
}

export async function improveFacebookPost(content: string) {
  return callAiSuggest({ action: 'improve_facebook', content, platform: 'facebook' });
}

export async function suggestFacebookHashtags(content: string) {
  return callAiSuggest({ action: 'suggest_facebook_hashtags', content, platform: 'facebook' });
}
