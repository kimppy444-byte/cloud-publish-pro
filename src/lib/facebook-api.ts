import { supabase } from "@/integrations/supabase/client";

interface FacebookApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function callFacebookApi(action: string, params: Record<string, string> = {}): Promise<FacebookApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('facebook-api', {
      body: { action, ...params },
    });

    if (error) {
      // Try to extract the actual error message from the response context
      const context = (error as any)?.context;
      if (context && typeof context === 'object') {
        try {
          const body = await context.json?.();
          if (body?.error) {
            return { success: false, error: body.error };
          }
        } catch {}
      }
      console.error('Edge function error:', error);
      return { success: false, error: error.message };
    }

    return data as FacebookApiResponse;
  } catch (err: any) {
    console.error('Facebook API call failed:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function getFacebookPages() {
  return callFacebookApi('get_pages');
}

export async function getPageVideos(pageId: string) {
  return callFacebookApi('get_page_videos', { pageId });
}

export async function getPageInsights(pageId: string) {
  return callFacebookApi('get_page_insights', { pageId });
}

export async function getInstagramAccount(pageId: string) {
  return callFacebookApi('get_instagram_account', { pageId });
}

export async function getInstagramMedia(igAccountId: string) {
  return callFacebookApi('get_instagram_media', { igAccountId });
}

export async function getUserInfo() {
  return callFacebookApi('get_user_info');
}
