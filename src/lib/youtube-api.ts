import { supabase } from "@/integrations/supabase/client";

interface ApiResult {
  success: boolean;
  data?: any;
  error?: string;
}

async function invokeYouTubeAuth(body: Record<string, any>): Promise<ApiResult> {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-auth', { body });
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
    return data as ApiResult;
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function getYouTubeAuthUrl(redirectUri: string) {
  return invokeYouTubeAuth({ action: 'get_auth_url', redirectUri });
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  return invokeYouTubeAuth({ action: 'exchange_code', code, redirectUri });
}

export async function getYouTubeStatus() {
  return invokeYouTubeAuth({ action: 'get_status' });
}

export async function getYouTubeChannels() {
  return invokeYouTubeAuth({ action: 'get_channels' });
}

export async function getYouTubeChannelAnalytics(channelTokenId: string) {
  return invokeYouTubeAuth({ action: 'get_channel_analytics', channelTokenId });
}

export async function validateYouTubeConfig(redirectUri: string) {
  return invokeYouTubeAuth({ action: 'validate', redirectUri });
}

export async function disconnectYouTube(channelTokenId?: string) {
  return invokeYouTubeAuth({ action: 'disconnect', channelTokenId });
}
