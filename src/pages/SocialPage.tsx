import { motion } from "framer-motion";
import { Facebook, Instagram, Eye, ThumbsUp, Share2, Heart, MessageCircle, Video, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/StatCard";
import { useEffect, useState } from "react";
import { getFacebookPages, getPageVideos, getPageInsights, getInstagramAccount, getInstagramMedia } from "@/lib/facebook-api";

interface FbPage {
  id: string;
  name: string;
  fan_count?: number;
  category?: string;
  picture?: { data?: { url?: string } };
}

interface FbVideo {
  id: string;
  title?: string;
  description?: string;
  created_time: string;
  views?: number;
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
}

interface IgAccount {
  id: string;
  name?: string;
  username?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
}

interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  thumbnail_url?: string;
  media_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

const SocialPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<FbPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [fbVideos, setFbVideos] = useState<FbVideo[]>([]);
  const [igAccount, setIgAccount] = useState<IgAccount | null>(null);
  const [igMedia, setIgMedia] = useState<IgMedia[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingIg, setLoadingIg] = useState(false);
  const [pageInsights, setPageInsights] = useState<any>(null);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    const res = await getFacebookPages();
    if (!res.success) {
      setError(res.error || 'Failed to fetch pages');
      setLoading(false);
      return;
    }
    const fetchedPages = res.data?.data || [];
    setPages(fetchedPages);
    if (fetchedPages.length > 0) {
      setSelectedPageId(fetchedPages[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (!selectedPageId) return;

    const loadPageData = async () => {
      setLoadingVideos(true);
      setLoadingIg(true);

      const [videosRes, igRes, insightsRes] = await Promise.all([
        getPageVideos(selectedPageId),
        getInstagramAccount(selectedPageId),
        getPageInsights(selectedPageId),
      ]);

      if (videosRes.success) {
        setFbVideos(videosRes.data?.data || []);
      }
      setLoadingVideos(false);

      if (insightsRes.success) {
        setPageInsights(insightsRes.data);
      }

      if (igRes.success && igRes.data?.instagram_business_account) {
        const igAcc = igRes.data.instagram_business_account;
        setIgAccount(igAcc);
        const mediaRes = await getInstagramMedia(igAcc.id);
        if (mediaRes.success) {
          setIgMedia(mediaRes.data?.data || []);
        }
      } else {
        setIgAccount(null);
        setIgMedia([]);
      }
      setLoadingIg(false);
    };

    loadPageData();
  }, [selectedPageId]);

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Facebook & Instagram</h1>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <p className="font-medium text-foreground">Failed to connect</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button variant="outline" onClick={fetchPages}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Facebook & Instagram</h1>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-4">
          <Facebook className="w-12 h-12 text-facebook mx-auto" />
          <div>
            <p className="font-medium text-foreground">No pages found</p>
            <p className="text-sm text-muted-foreground mt-1">Your access token doesn't have access to any Facebook pages.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalFbViews = fbVideos.reduce((s, v) => s + (v.views || 0), 0);
  const totalFbLikes = fbVideos.reduce((s, v) => s + (v.likes?.summary?.total_count || 0), 0);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Facebook & Instagram</h1>
          <p className="text-muted-foreground">
            Manage content across your connected pages
          </p>
        </div>
        <Button variant="outline" onClick={fetchPages}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </motion.div>

      {/* Page selector */}
      {pages.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {pages.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPageId(p.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                selectedPageId === p.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-muted-foreground/30"
              }`}
            >
              {p.picture?.data?.url && (
                <img src={p.picture.data.url} alt="" className="w-5 h-5 rounded-full" />
              )}
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Page info bar */}
      {selectedPage && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50">
          {selectedPage.picture?.data?.url && (
            <img src={selectedPage.picture.data.url} alt="" className="w-10 h-10 rounded-lg" />
          )}
          <div>
            <p className="font-display font-semibold text-foreground">{selectedPage.name}</p>
            <p className="text-xs text-muted-foreground">
              {selectedPage.category} · {selectedPage.fan_count?.toLocaleString() || 0} followers
            </p>
          </div>
          {igAccount && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Instagram className="w-4 h-4 text-instagram" />
              @{igAccount.username} · {igAccount.followers_count?.toLocaleString()} followers
            </div>
          )}
        </motion.div>
      )}

      <Tabs defaultValue="facebook" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="facebook" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Facebook className="w-4 h-4 mr-2" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Instagram className="w-4 h-4 mr-2" />
            Instagram
          </TabsTrigger>
        </TabsList>

        {/* Facebook Tab */}
        <TabsContent value="facebook" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Page Followers" value={pageInsights?.fan_count?.toLocaleString() || "0"} icon={Eye} platform="facebook" />
            <StatCard title="Video Views" value={totalFbViews.toLocaleString()} icon={Eye} platform="facebook" />
            <StatCard title="Video Likes" value={totalFbLikes.toLocaleString()} icon={ThumbsUp} platform="facebook" />
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border/50">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground text-lg">Videos</h2>
            </div>
            {loadingVideos ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : fbVideos.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">No videos found on this page</div>
            ) : (
              <div className="divide-y divide-border">
                {fbVideos.map((v) => (
                  <div key={v.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Video className="w-5 h-5 text-facebook" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{v.title || 'Untitled Video'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(v.created_time).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {(v.views || 0).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> {(v.likes?.summary?.total_count || 0).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {(v.comments?.summary?.total_count || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="space-y-6">
          {loadingIg ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !igAccount ? (
            <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-3">
              <Instagram className="w-10 h-10 text-instagram mx-auto" />
              <p className="font-medium text-foreground">No Instagram account linked</p>
              <p className="text-sm text-muted-foreground">This Facebook page doesn't have a linked Instagram Business account.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Followers" value={igAccount.followers_count?.toLocaleString() || "0"} icon={Eye} platform="instagram" />
                <StatCard title="Total Posts" value={igAccount.media_count?.toLocaleString() || "0"} icon={Video} platform="instagram" />
                <StatCard
                  title="Total Likes"
                  value={igMedia.reduce((s, m) => s + (m.like_count || 0), 0).toLocaleString()}
                  icon={Heart}
                  platform="instagram"
                />
              </div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border/50">
                <div className="p-5 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground text-lg">Recent Media</h2>
                </div>
                {igMedia.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">No media found</div>
                ) : (
                  <div className="divide-y divide-border">
                    {igMedia.map((m) => (
                      <div key={m.id} className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {(m.thumbnail_url || m.media_url) ? (
                            <img src={m.thumbnail_url || m.media_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Instagram className="w-5 h-5 text-instagram" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground line-clamp-1 max-w-xs">
                              {m.caption || 'No caption'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.media_type?.replace('_', ' ')} · {new Date(m.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {(m.like_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {(m.comments_count || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialPage;
