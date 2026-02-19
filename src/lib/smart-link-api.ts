/**
 * Smart Link API client
 * Generates social-unlock links for YouTube and Facebook/Instagram posts.
 * Base URL: https://v0-sssw.vercel.app
 * Links are constructed locally by encoding the payload into the URL.
 * Format: /u/{videoId}?d={base64url_encoded_payload}
 */

const API_BASE = "https://v0-sssw.vercel.app";

export interface YouTubeSmartLinkRequest {
  videoId: string;
  channelId: string; // actual YouTube channel ID (UCxxxx...)
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
}

/**
 * Encode payload as base64url (URL-safe base64)
 */
function base64url(payload: unknown[]): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate a YouTube smart link.
 * Encodes [mask, compactChannelId, targetUrl] and constructs the URL locally.
 */
export async function generateYouTubeSmartLink(
  req: YouTubeSmartLinkRequest
): Promise<SmartLinkResponse> {
  try {
    // Action mask: subscribe=1, like=2, comment=4
    let mask = 0;
    if (req.actions.subscribe) mask |= 1;
    if (req.actions.like) mask |= 2;
    if (req.actions.comment) mask |= 4;

    // Strip "UC" prefix for compact encoding
    const compactChannelId = req.channelId.startsWith("UC")
      ? req.channelId.slice(2)
      : req.channelId;

    const payload = [mask, compactChannelId, req.targetUrl];
    const encoded = base64url(payload);
    const smartLink = `${API_BASE}/u/${req.videoId}?d=${encoded}`;

    return { success: true, smartLink, longUrl: smartLink };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate smart link" };
  }
}

/**
 * Generate a Facebook/Instagram smart link.
 * Encodes [mask, platform, pageId, postUrl, targetUrl, pageName] and constructs the URL locally.
 */
export async function generateFacebookSmartLink(
  req: FacebookSmartLinkRequest
): Promise<SmartLinkResponse> {
  try {
    // Action mask: follow=1, like=2, comment=4
    let mask = 0;
    if (req.actions.follow) mask |= 1;
    if (req.actions.like) mask |= 2;
    if (req.actions.comment) mask |= 4;

    const p = req.platform === "instagram" ? "i" : "f";
    const payload = [mask, p, req.pageId, req.postUrl || "", req.targetUrl, req.pageName || ""];
    const encoded = base64url(payload);
    const smartLink = `${API_BASE}/u/fb/${req.postId}?d=${encoded}`;

    return { success: true, smartLink, longUrl: smartLink };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate smart link" };
  }
}
