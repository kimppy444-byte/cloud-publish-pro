/**
 * /article/:id?d=<base64url>
 *
 * Dynamic host page for self-hosted smart links (shortened via spoo.me etc.).
 * Picks an existing blog post deterministically from `:id`, renders the full
 * article (so it looks like a normal editorial page to AdSense / users), then
 * embeds the YouTube unlock gate at the bottom which routes to the target URL.
 *
 * Not linked from anywhere on the site — discoverable only via the smart link.
 * Always emits `noindex` so it cannot end up in search results or feed lists.
 *
 * `d` payload format (same as /u/:videoId): [mask, compactChannelId, targetUrl]
 *   mask: subscribe=1, like=2, comment=4
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Calendar, Clock, CheckCircle2, Lock, ThumbsUp, MessageSquare, Youtube, ArrowRight, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { posts } from "@/content/posts";
import AdSlot from "@/components/AdSlot";

declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void; } }

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function renderBody(md: string) {
  const blocks = md.split(/\n\n+/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("### ")) {
      return <h3 key={i} className="text-xl md:text-2xl font-bold mt-10 mb-3 text-white">{trimmed.slice(4)}</h3>;
    }
    if (trimmed.startsWith("## ")) {
      return <h2 key={i} className="text-2xl md:text-3xl font-bold mt-12 mb-4 text-white">{trimmed.slice(3)}</h2>;
    }
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-gray-300 leading-relaxed mb-5 text-[17px]">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          ) : (<span key={j}>{part}</span>)
        )}
      </p>
    );
  });
}

export default function ArticleUnlockPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();

  // Decode payload (same shape as /u/:videoId)
  const { videoId, channelId, targetUrl, actions } = useMemo(() => {
    let videoId = id;
    let channelId = "";
    let targetUrl = "";
    let actions = { subscribe: true, like: true, comment: false };
    try {
      const d = searchParams.get("d");
      if (d) {
        const base64 = d.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        const decoded = JSON.parse(atob(padded));
        if (Array.isArray(decoded) && decoded.length === 3) {
          const [mask, cId, tUrl] = decoded;
          channelId = typeof cId === "string" && cId.length === 22 ? `UC${cId}` : cId;
          targetUrl = tUrl;
          actions = {
            subscribe: (mask & 1) === 1,
            like: (mask & 2) === 2,
            comment: (mask & 4) === 4,
          };
        }
      }
    } catch (e) {
      console.error("Failed to parse article unlock params", e);
    }
    return { videoId, channelId, targetUrl, actions };
  }, [id, searchParams]);

  // Deterministically pick an existing post as the host article
  const post = useMemo(() => posts[hashStr(id || "x") % posts.length], [id]);

  // Gate state (mirrors UnlockYouTubePage)
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [actionsDone, setActionsDone] = useState(false);
  const [bonusClicks, setBonusClicks] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const watchSatisfied = watchedSeconds >= 6;
  const unlocked = actionsDone && bonusClicks >= 2 && watchSatisfied;

  useEffect(() => {
    if (watchSatisfied) return;
    const t = setInterval(() => setWatchedSeconds(s => Math.min(6, s + 1)), 1000);
    return () => clearInterval(t);
  }, [watchSatisfied]);

  const verify = (action: string, url: string) => {
    window.open(url, "_blank");
    setVerifying(v => ({ ...v, [action]: true }));
    setTimeout(() => {
      setCompleted(prev => {
        const next = { ...prev, [action]: true };
        const req: string[] = [];
        if (actions.subscribe) req.push("subscribe");
        if (actions.like) req.push("like");
        if (actions.comment) req.push("comment");
        if (req.every(r => next[r])) setActionsDone(true);
        return next;
      });
      setVerifying(v => ({ ...v, [action]: false }));
    }, 5000);
  };

  const handleBonusClick = () => {
    window.open("https://omg10.com/4/11035810", "_blank");
    setBonusClicks(c => Math.min(2, c + 1));
  };

  const handleUnlock = () => {
    if (unlocked && targetUrl) window.location.href = targetUrl;
  };

  const body = renderBody(post.body);
  const adIndex = Math.floor(body.length * 0.4);
  const withAd = [
    ...body.slice(0, adIndex),
    <AdSlot key="mid-ad" slot="3333333333" />,
    ...body.slice(adIndex),
  ];

  return (
    <>
      <Helmet>
        <title>{post.title}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="rating" content="general" />
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase mb-3">{post.category}</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-5">{post.title}</h1>
        <p className="text-lg text-gray-400 mb-6 leading-relaxed">{post.excerpt}</p>

        <div className="flex items-center gap-4 text-sm text-gray-500 pb-6 border-b border-white/5 mb-10">
          <span>By <strong className="text-gray-300 font-medium">{post.author}</strong></span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {post.readingMinutes} min read
          </span>
        </div>

        <AdSlot slot="4444444444" />

        <div className="prose-content">{withAd}</div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/5 text-gray-400">#{tag}</span>
          ))}
        </div>

        {/* Unlock gate */}
        <section className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400 mb-3">
            Bonus for readers who made it this far
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Watch the short clip below and complete the quick actions to unlock the link.
          </p>

          <Card className="bg-[#1a1a1a] border-white/5 shadow-2xl overflow-hidden">
            <div className="aspect-video w-full bg-black relative">
              <YouTubeAutoplayer videoId={videoId} />
              {!watchSatisfied && (
                <div className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold text-white pointer-events-none">
                  Watching... {6 - watchedSeconds}s
                </div>
              )}
              {watchSatisfied && (
                <div className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-green-600/90 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-1 pointer-events-none">
                  <CheckCircle2 className="w-3 h-3" /> Watch verified
                </div>
              )}
            </div>
            <div className="p-6 space-y-4">
              {actions.subscribe && (
                <ActionBtn label="Subscribe to Channel" icon={<Youtube className="w-5 h-5 text-white" />} colorBg="bg-red-600"
                  done={completed.subscribe} loading={verifying.subscribe}
                  onClick={() => verify("subscribe", `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`)} />
              )}
              {actions.like && (
                <ActionBtn label="Like Video" icon={<ThumbsUp className="w-5 h-5 text-white" />} colorBg="bg-blue-600"
                  done={completed.like} loading={verifying.like}
                  onClick={() => verify("like", `https://www.youtube.com/watch?v=${videoId}`)} />
              )}
              {actions.comment && (
                <ActionBtn label="Comment on Video" icon={<MessageSquare className="w-5 h-5 text-white" />} colorBg="bg-green-600"
                  done={completed.comment} loading={verifying.comment}
                  onClick={() => verify("comment", `https://www.youtube.com/watch?v=${videoId}`)} />
              )}
            </div>
            <div className="p-6 bg-white/5 border-t border-white/5 space-y-3">
              {actionsDone && bonusClicks < 2 && (
                <Button
                  onClick={handleBonusClick}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/25 animate-pulse"
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5" />
                    Click this button {2 - bonusClicks} more time{2 - bonusClicks === 1 ? "" : "s"}
                  </span>
                </Button>
              )}
              <Button
                className={`w-full h-12 text-lg font-bold transition-all duration-300 ${
                  unlocked
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
                onClick={handleUnlock}
                disabled={!unlocked}
              >
                {unlocked ? (
                  <span className="flex items-center gap-2"><Download className="w-5 h-5" />Unlock Link</span>
                ) : (
                  <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Complete Steps to Unlock</span>
                )}
              </Button>
            </div>
          </Card>
        </section>

        <AdSlot slot="5555555555" />
      </article>
    </>
  );
}

function ActionBtn({ label, icon, colorBg, done, loading, onClick }: {
  label: string; icon: React.ReactNode; colorBg: string;
  done?: boolean; loading?: boolean; onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className={`w-full h-14 justify-between group border-white/10 hover:bg-white/5 ${
        done ? "bg-green-500/10 border-green-500/50 hover:bg-green-500/20" : ""
      }`}
      onClick={onClick}
      disabled={done || loading}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${done ? "bg-green-500" : colorBg}`}>{icon}</div>
        <div className="text-left">
          <div className="font-semibold">{label}</div>
          <div className="text-xs text-muted-foreground">Required</div>
        </div>
      </div>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        : done ? <CheckCircle2 className="w-5 h-5 text-green-500" />
        : <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />}
    </Button>
  );
}

function YouTubeAutoplayer({ videoId }: { videoId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;

    const loadApi = () => new Promise<void>((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      if (!existing) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(s);
      }
    });

    loadApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, rel: 0, showinfo: 0,
          modestbranding: 1, playsinline: 1, loop: 1, playlist: videoId,
          disablekb: 1, fs: 0, iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => { try { e.target.mute(); e.target.playVideo(); } catch {} },
          onStateChange: (e: any) => {
            if (e.data === 2 || e.data === 0) {
              try { e.target.seekTo(e.data === 0 ? 0 : e.target.getCurrentTime(), true); e.target.playVideo(); } catch {}
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try { playerRef.current?.destroy?.(); } catch {}
    };
  }, [videoId]);

  return <div ref={containerRef} className="w-full h-full" />;
}
