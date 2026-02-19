/**
 * Smart Link API client
 * Generates social-unlock links for YouTube and Facebook/Instagram posts.
 * API docs: https://v0-sssw.vercel.app
 * No authentication required.
 */

const API_BASE = "https://v0-sssw.vercel.app";

export interface YouTubeSmartLinkRequest {
  videoId: string;
  channelId: string;
  targetUrl: string;
  actions: {
    subscribe: boolean;
    like: boolean;
    comment: boolean;
  };
}

export interface FacebookSmartLinkRequest {
  postId: string;
  pageId: string;
  platform: "facebook" | "instagram";
  targetUrl: string;
  pageName?: string;
  postUrl?: string;
  actions: {
    follow: boolean;
    like: boolean;
    comment: boolean;
  };
}

export interface SmartLinkResponse {
  success: boolean;
  smartLink?: string;
  longUrl?: string;
  error?: string;
  videoId?: string;
  channelId?: string;
  postId?: string;
  pageId?: string;
  platform?: string;
  actions?: Record<string, boolean>;
}

export async function generateYouTubeSmartLink(
  req: YouTubeSmartLinkRequest
): Promise<SmartLinkResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/smart-link/youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

export async function generateFacebookSmartLink(
  req: FacebookSmartLinkRequest
): Promise<SmartLinkResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/smart-link/facebook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}
