import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Facebook, Instagram, Key, User, Upload, Settings as SettingsIcon, Loader2, CheckCircle2, XCircle, ExternalLink, Unplug } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getFacebookPages, getInstagramAccount } from "@/lib/facebook-api";
import { getYouTubeAuthUrl, getYouTubeStatus, disconnectYouTube } from "@/lib/youtube-api";

interface ConnectedAccount {
  id: string;
  name: string;
  platform: "Facebook" | "Instagram" | "YouTube";
  detail: string;
  picture?: string;
}

const SettingsPage = () => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [ytConnected, setYtConnected] = useState(false);
  const [ytChannelTitle, setYtChannelTitle] = useState('');
  const [connectingYt, setConnectingYt] = useState(false);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    const accs: ConnectedAccount[] = [];

    // Load FB/IG
    const res = await getFacebookPages();
    if (res.success) {
      const pages = res.data?.data || [];
      for (const page of pages) {
        accs.push({
          id: `fb-${page.id}`,
          name: page.name,
          platform: "Facebook",
          detail: `${page.category || 'Page'} · ${page.fan_count?.toLocaleString() || 0} followers`,
          picture: page.picture?.data?.url,
        });

        const igRes = await getInstagramAccount(page.id, page.access_token);
        if (igRes.success && igRes.data?.instagram_business_account) {
          const ig = igRes.data.instagram_business_account;
          accs.push({
            id: `ig-${ig.id}`,
            name: ig.name || ig.username || page.name,
            platform: "Instagram",
            detail: `@${ig.username} · ${ig.followers_count?.toLocaleString() || 0} followers`,
            picture: ig.profile_picture_url,
          });
        }
      }
    }

    // Check YouTube
    const ytRes = await getYouTubeStatus();
    if (ytRes.success && ytRes.data?.connected) {
      setYtConnected(true);
      setYtChannelTitle(ytRes.data.channelTitle || 'YouTube Channel');
      accs.push({
        id: 'yt-channel',
        name: ytRes.data.channelTitle || 'YouTube Channel',
        platform: "YouTube",
        detail: `Channel ID: ${ytRes.data.channelId || 'Unknown'}`,
      });
    } else {
      setYtConnected(false);
    }

    setAccounts(accs);
    setLoadingAccounts(false);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleConnectYouTube = async () => {
    setConnectingYt(true);
    const redirectUri = `${window.location.origin}/youtube-callback`;
    const res = await getYouTubeAuthUrl(redirectUri);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error(res.error || 'Failed to get auth URL');
      setConnectingYt(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    const res = await disconnectYouTube();
    if (res.success) {
      toast.success('YouTube disconnected');
      setYtConnected(false);
      setYtChannelTitle('');
      loadAccounts();
    } else {
      toast.error(res.error || 'Failed to disconnect');
    }
  };

  const YtIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-youtube" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your accounts and configuration</p>
      </motion.div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="w-4 h-4 mr-2" /> Accounts
          </TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Key className="w-4 h-4 mr-2" /> Connections
          </TabsTrigger>
          <TabsTrigger value="defaults" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Upload className="w-4 h-4 mr-2" /> Defaults
          </TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <SettingsIcon className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border/50">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">Connected Accounts</h2>
              <p className="text-sm text-muted-foreground mt-1">All pages and channels linked to your API credentials</p>
            </div>
            {loadingAccounts ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No accounts found. Configure connections in the Connections tab.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {accounts.map((acc) => (
                  <div key={acc.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {acc.picture ? (
                        <img src={acc.picture} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          {acc.platform === "Instagram" ? <Instagram className="w-4 h-4 text-instagram" /> :
                           acc.platform === "YouTube" ? <YtIcon /> :
                           <Facebook className="w-4 h-4 text-facebook" />}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.platform} · {acc.detail}</p>
                      </div>
                    </div>
                    <span className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Facebook/Instagram */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Facebook className="w-6 h-6 text-facebook" />
                  <div>
                    <p className="font-medium text-foreground">Facebook & Instagram</p>
                    <p className="text-xs text-muted-foreground">Connected via Facebook Graph API access token</p>
                  </div>
                </div>
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Your Facebook API key is configured as a secure backend secret. To update permissions, generate a new token in your Facebook Developer App with <code className="bg-muted px-1 rounded">pages_manage_posts</code>, <code className="bg-muted px-1 rounded">pages_read_engagement</code>, and <code className="bg-muted px-1 rounded">instagram_content_publish</code> permissions.
              </p>
            </div>

            {/* YouTube */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <YtIcon />
                  <div>
                    <p className="font-medium text-foreground">YouTube</p>
                    <p className="text-xs text-muted-foreground">
                      {ytConnected ? `Connected: ${ytChannelTitle}` : 'Connect via Google OAuth to upload videos'}
                    </p>
                  </div>
                </div>
                {ytConnected ? (
                  <span className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Not connected
                  </span>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                {ytConnected ? (
                  <Button variant="outline" size="sm" onClick={handleDisconnectYouTube}>
                    <Unplug className="w-4 h-4 mr-2" /> Disconnect
                  </Button>
                ) : (
                  <Button size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90" onClick={handleConnectYouTube} disabled={connectingYt}>
                    {connectingYt ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                    Connect YouTube
                  </Button>
                )}
              </div>
              {!ytConnected && (
                <p className="text-xs text-muted-foreground mt-3">
                  Note: Your Google Cloud project must have the <strong>YouTube Data API v3</strong> enabled and the redirect URI <code className="bg-muted px-1 rounded">{window.location.origin}/youtube-callback</code> registered in your OAuth client settings.
                </p>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <h2 className="font-display font-semibold text-foreground">Default Upload Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Title Template</label>
                <Input placeholder="e.g., {date} - New Video" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Description</label>
                <Textarea placeholder="Enter default description template" rows={4} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Tags</label>
                <Input placeholder="gaming, tutorial, roblox" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-apply defaults</p>
                  <p className="text-xs text-muted-foreground">Apply these defaults to all new uploads automatically</p>
                </div>
                <Switch />
              </div>
              <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90" onClick={() => toast.success("Defaults saved!")}>Save Defaults</Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <h2 className="font-display font-semibold text-foreground">General Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
                <Input placeholder="Your name" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input placeholder="your@email.com" type="email" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium text-foreground">Email notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified when uploads complete</p>
                </div>
                <Switch />
              </div>
              <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90" onClick={() => toast.success("Settings saved!")}>Save Settings</Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
