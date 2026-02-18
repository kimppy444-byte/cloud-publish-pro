import { motion } from "framer-motion";
import { Eye, ThumbsUp, MessageCircle, Users, Loader2, RefreshCw, Film, TrendingUp, BarChart3 } from "lucide-react";
import { Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/StatCard";
import { useEffect, useState } from "react";
import { getYouTubeChannels, getYouTubeChannelAnalytics } from "@/lib/youtube-api";
import { getFacebookPages, getPageVideos, getPageInsights, getInstagramAccount, getInstagramMedia } from "@/lib/facebook-api";

interface YtChannel {
  id: string;
  channelId: string;
  channelTitle: string;
}

interface YtVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

interface YtChannelStats {
  title: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

const YtIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-youtube" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const AnalyticsPage = () => {
  const [ytChannels, setYtChannels] = useState<YtChannel[]>([]);
  const [selectedYtChannel, setSelectedYtChannel] = useState<string | null>(null);
  const [ytStats, setYtStats] = useState<YtChannelStats | null>(null);
  const [ytVideos, setYtVideos] = useState<YtVideo[]>([]);
  const [loadingYt, setLoadingYt] = useState(true);
  const [loadingYtData, setLoadingYtData] = useState(false);

  // FB/IG state
  const [fbPages, setFbPages] = useState<any[]>([]);
  const [fbTotalFollowers, setFbTotalFollowers] = useState(0);
  const [fbTotalViews, setFbTotalViews] = useState(0);
  const [igTotalFollowers, setIgTotalFollowers] = useState(0);
  const [igTotalPosts, setIgTotalPosts] = useState(0);
  const [loadingFb, setLoadingFb] = useState(true);

  useEffect(() => {
    loadYtChannels();
    loadFbData();
  }, []);

  const loadYtChannels = async () => {
    setLoadingYt(true);
    const res = await getYouTubeChannels();
    if (res.success && res.data?.channels) {
      setYtChannels(res.data.channels);
      if (res.data.channels.length > 0) {
        setSelectedYtChannel(res.data.channels[0].id);
      }
    }
    setLoadingYt(false);
  };

  const loadFbData = async () => {
    setLoadingFb(true);
    const res = await getFacebookPages();
    if (res.success && res.data?.data) {
      const pages = res.data.data;
      setFbPages(pages);
      let fbFollowers = 0;
      let igFollowers = 0;
      let igPosts = 0;

      for (const page of pages) {
        fbFollowers += page.fan_count || 0;
        const igRes = await getInstagramAccount(page.id, page.access_token);
        if (igRes.success && igRes.data?.instagram_business_account) {
          igFollowers += igRes.data.instagram_business_account.followers_count || 0;
          igPosts += igRes.data.instagram_business_account.media_count || 0;
        }
      }
      setFbTotalFollowers(fbFollowers);
      setIgTotalFollowers(igFollowers);
      setIgTotalPosts(igPosts);
    }
    setLoadingFb(false);
  };

  useEffect(() => {
    if (!selectedYtChannel) return;
    const loadChannelData = async () => {
      setLoadingYtData(true);
      const res = await getYouTubeChannelAnalytics(selectedYtChannel);
      if (res.success && res.data) {
        setYtStats(res.data.channel);
        setYtVideos(res.data.videos || []);
      }
      setLoadingYtData(false);
    };
    loadChannelData();
  }, [selectedYtChannel]);

  const totalYtViews = ytVideos.reduce((s, v) => s + v.viewCount, 0);
  const totalYtLikes = ytVideos.reduce((s, v) => s + v.likeCount, 0);
  const totalYtComments = ytVideos.reduce((s, v) => s + v.commentCount, 0);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Performance metrics across all platforms</p>
        </div>
        <Button variant="outline" onClick={() => { loadYtChannels(); loadFbData(); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </motion.div>

      {/* Cross-platform overview */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="YT Subscribers" value={ytStats?.subscriberCount?.toLocaleString() || '—'} icon={Users} platform="youtube" />
        <StatCard title="FB Followers" value={loadingFb ? '...' : fbTotalFollowers.toLocaleString()} icon={Users} platform="facebook" />
        <StatCard title="IG Followers" value={loadingFb ? '...' : igTotalFollowers.toLocaleString()} icon={Users} platform="instagram" />
        <StatCard title="Total YT Views" value={ytStats?.viewCount?.toLocaleString() || '—'} icon={Eye} platform="youtube" />
      </motion.div>

      <Tabs defaultValue="youtube" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="youtube" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <YtIcon /> <span className="ml-2">YouTube</span>
          </TabsTrigger>
          <TabsTrigger value="facebook" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Facebook className="w-4 h-4 mr-2" /> Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Instagram className="w-4 h-4 mr-2" /> Instagram
          </TabsTrigger>
        </TabsList>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="space-y-6">
          {loadingYt ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : ytChannels.length === 0 ? (
            <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-3">
              <YtIcon />
              <p className="font-medium text-foreground">No YouTube channels connected</p>
              <p className="text-sm text-muted-foreground">Connect your YouTube channels in Settings to see analytics.</p>
            </div>
          ) : (
            <>
              {/* Channel selector */}
              {ytChannels.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {ytChannels.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedYtChannel(ch.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedYtChannel === ch.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      <YtIcon />
                      {ch.channelTitle || 'Channel'}
                    </button>
                  ))}
                </div>
              )}

              {loadingYtData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {/* Channel stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard title="Subscribers" value={ytStats?.subscriberCount?.toLocaleString() || '0'} icon={Users} platform="youtube" />
                    <StatCard title="Total Views" value={ytStats?.viewCount?.toLocaleString() || '0'} icon={Eye} platform="youtube" />
                    <StatCard title="Videos" value={ytStats?.videoCount?.toLocaleString() || '0'} icon={Film} platform="youtube" />
                    <StatCard title="Recent Likes" value={totalYtLikes.toLocaleString()} icon={ThumbsUp} platform="youtube" />
                  </div>

                  {/* Recent videos with thumbnails */}
                  <div className="bg-card rounded-xl shadow-card border border-border/50">
                    <div className="p-5 border-b border-border">
                      <h2 className="font-display font-semibold text-foreground text-lg">Recent Videos</h2>
                    </div>
                    {ytVideos.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground text-sm">No videos found</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {ytVideos.map(v => (
                          <div key={v.id} className="px-5 py-4 flex items-center gap-4">
                            {v.thumbnail && (
                              <img src={v.thumbnail} alt="" className="w-28 h-16 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground line-clamp-1">{v.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(v.publishedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-5 text-sm text-muted-foreground flex-shrink-0">
                              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {v.viewCount.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> {v.likeCount.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {v.commentCount.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* Facebook Tab */}
        <TabsContent value="facebook" className="space-y-6">
          {loadingFb ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Pages" value={fbPages.length.toString()} icon={Facebook} platform="facebook" />
                <StatCard title="Total Followers" value={fbTotalFollowers.toLocaleString()} icon={Users} platform="facebook" />
                <StatCard title="IG Posts" value={igTotalPosts.toLocaleString()} icon={Film} platform="facebook" />
              </div>
              <div className="bg-card rounded-xl shadow-card border border-border/50">
                <div className="p-5 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground text-lg">Connected Pages</h2>
                </div>
                <div className="divide-y divide-border">
                  {fbPages.map(p => (
                    <div key={p.id} className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {p.picture?.data?.url ? (
                          <img src={p.picture.data.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Facebook className="w-5 h-5 text-facebook" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category} · {(p.fan_count || 0).toLocaleString()} followers</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="space-y-6">
          {loadingFb ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="IG Followers" value={igTotalFollowers.toLocaleString()} icon={Users} platform="instagram" />
                <StatCard title="Total Posts" value={igTotalPosts.toLocaleString()} icon={Film} platform="instagram" />
                <StatCard title="Accounts" value={fbPages.length > 0 ? 'Active' : 'None'} icon={Instagram} platform="instagram" />
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                  View detailed Instagram media and engagement on the <a href="/social" className="text-primary hover:underline">Facebook & IG</a> page.
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
