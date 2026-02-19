import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Facebook, Instagram, Key, User, Upload, Settings as SettingsIcon, Loader2, CheckCircle2, XCircle, ExternalLink, Unplug, Plus, Trash2, Globe, Lock, Eye, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getFacebookPages, getInstagramAccount } from "@/lib/facebook-api";
import { getYouTubeAuthUrl, getYouTubeChannels, disconnectYouTube, validateYouTubeConfig } from "@/lib/youtube-api";
import { getUploadDefaults, saveUploadDefaults, type UploadDefaults } from "@/lib/youtube-direct";

interface ConnectedAccount {
  id: string;
  name: string;
  platform: "Facebook" | "Instagram" | "YouTube";
  detail: string;
  picture?: string;
  channelTokenId?: string;
}

interface YtChannel {
  id: string;
  channelId: string;
  channelTitle: string;
}

const YtIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-youtube" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);


const CATEGORIES = [
  { id: "1", name: "Film & Animation" }, { id: "2", name: "Autos & Vehicles" },
  { id: "10", name: "Music" }, { id: "15", name: "Pets & Animals" },
  { id: "17", name: "Sports" }, { id: "19", name: "Travel & Events" },
  { id: "20", name: "Gaming" }, { id: "22", name: "People & Blogs" },
  { id: "23", name: "Comedy" }, { id: "24", name: "Entertainment" },
  { id: "25", name: "News & Politics" }, { id: "26", name: "Howto & Style" },
  { id: "27", name: "Education" }, { id: "28", name: "Science & Technology" },
];

const SettingsPage = () => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [ytChannels, setYtChannels] = useState<YtChannel[]>([]);
  const [connectingYt, setConnectingYt] = useState(false);

  // Upload defaults state
  const [defaults, setDefaults] = useState<UploadDefaults>({
    privacy: "private",
    category: "22",
    allowComments: true,
    allowRatings: true,
    description: "",
    tags: "",
    socialUnlockEnabled: false,
    socialUnlockTargetUrl: "",
    socialUnlockActions: { subscribe: true, like: true, comment: false },
  });
  const [defaultsSaved, setDefaultsSaved] = useState(false);

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

    // Load YouTube channels
    const ytRes = await getYouTubeChannels();
    if (ytRes.success && ytRes.data?.channels) {
      setYtChannels(ytRes.data.channels);
      for (const ch of ytRes.data.channels) {
        accs.push({
          id: `yt-${ch.id}`,
          name: ch.channelTitle || 'YouTube Channel',
          platform: "YouTube",
          detail: `Channel ID: ${ch.channelId || 'Unknown'}`,
          channelTokenId: ch.id,
        });
      }
    } else {
      setYtChannels([]);
    }

    setAccounts(accs);
    setLoadingAccounts(false);
  };

  useEffect(() => {
    loadAccounts();
    // Load saved defaults
    const saved = getUploadDefaults();
    if (saved) setDefaults(saved);
  }, []);

  const handleConnectYouTube = async () => {
    setConnectingYt(true);
    const redirectUri = `${window.location.origin}/youtube-callback`;

    const validation = await validateYouTubeConfig(redirectUri);
    if (!validation.success || !validation.data?.valid) {
      const issues = validation.data?.issues || [validation.error || 'Unknown validation error'];
      toast.error('OAuth Configuration Issue', { description: issues.join('. '), duration: 10000 });
      setConnectingYt(false);
      return;
    }

    const res = await getYouTubeAuthUrl(redirectUri);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error(res.error || 'Failed to get auth URL');
      setConnectingYt(false);
    }
  };

  const handleDisconnectYouTube = async (channelTokenId?: string) => {
    const res = await disconnectYouTube(channelTokenId);
    if (res.success) {
      toast.success('YouTube channel disconnected');
      loadAccounts();
    } else {
      toast.error(res.error || 'Failed to disconnect');
    }
  };

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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                      </span>
                      {acc.platform === "YouTube" && acc.channelTokenId && (
                        <Button variant="ghost" size="sm" onClick={() => handleDisconnectYouTube(acc.channelTokenId)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
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
                Your Facebook API key is configured as a secure backend secret. To update permissions, generate a new token with <code className="bg-muted px-1 rounded">pages_manage_posts</code>, <code className="bg-muted px-1 rounded">pages_read_engagement</code>, and <code className="bg-muted px-1 rounded">instagram_content_publish</code> permissions.
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
                      {ytChannels.length > 0 ? `${ytChannels.length} channel${ytChannels.length > 1 ? 's' : ''} connected` : 'Connect via Google OAuth to upload videos'}
                    </p>
                  </div>
                </div>
                {ytChannels.length > 0 ? (
                  <span className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Not connected
                  </span>
                )}
              </div>

              {/* List connected channels */}
              {ytChannels.length > 0 && (
                <div className="mt-3 space-y-2">
                  {ytChannels.map(ch => (
                    <div key={ch.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <YtIcon />
                        <span className="text-sm font-medium text-foreground">{ch.channelTitle}</span>
                        <span className="text-xs text-muted-foreground">({ch.channelId})</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDisconnectYouTube(ch.id)}>
                        <Unplug className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Button size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90" onClick={handleConnectYouTube} disabled={connectingYt}>
                  {connectingYt ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {ytChannels.length > 0 ? 'Add Another Channel' : 'Connect YouTube'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Note: Your Google Cloud project must have the <strong>YouTube Data API v3</strong> enabled and the redirect URI <code className="bg-muted px-1 rounded">{window.location.origin}/youtube-callback</code> registered.
              </p>
            </div>
          </motion.div>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <div>
              <h2 className="font-display font-semibold text-foreground">Default Upload Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">These apply automatically to all new bulk uploads</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Description</label>
                <Textarea
                  placeholder="Your channel description, links, social handles…"
                  rows={5}
                  value={defaults.description}
                  onChange={e => setDefaults(d => ({ ...d, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Tags (comma separated)</label>
                <Input
                  placeholder="gaming, tutorial, vlog"
                  value={defaults.tags}
                  onChange={e => setDefaults(d => ({ ...d, tags: e.target.value }))}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Default Privacy</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "public", icon: <Globe className="w-3.5 h-3.5" />, label: "Public" },
                      { value: "unlisted", icon: <Eye className="w-3.5 h-3.5" />, label: "Unlisted" },
                      { value: "private", icon: <Lock className="w-3.5 h-3.5" />, label: "Private" },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setDefaults(d => ({ ...d, privacy: opt.value as any }))}
                        className={`p-2.5 rounded-lg border-2 text-center text-xs transition-all ${
                          defaults.privacy === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}>
                        <div className="flex justify-center mb-1">{opt.icon}</div>
                        <p className="font-semibold">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Default Category</label>
                  <select value={defaults.category}
                    onChange={e => setDefaults(d => ({ ...d, category: e.target.value }))}
                    className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
                  >
                    {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-6 p-3 bg-muted rounded-lg">
                {[
                  { label: "Allow comments", key: "allowComments" as keyof UploadDefaults },
                  { label: "Show likes/dislikes", key: "allowRatings" as keyof UploadDefaults },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={defaults[item.key] as boolean}
                      onChange={e => setDefaults(d => ({ ...d, [item.key]: e.target.checked }))}
                      className="rounded w-4 h-4"
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Social Unlock / Smart Links */}
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">Smart Links (Social Unlock)</h3>
                      <p className="text-xs text-muted-foreground">Auto-add unlock links to video descriptions</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={defaults.socialUnlockEnabled || false}
                      onChange={e => setDefaults(d => ({ ...d, socialUnlockEnabled: e.target.checked }))}
                      className="rounded w-5 h-5" />
                    <span className="text-sm font-semibold">Enable</span>
                  </label>
                </div>

                {defaults.socialUnlockEnabled && (
                  <div className="space-y-4 pt-3 border-t border-primary/20">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5" /> Target URL
                      </label>
                      <Input
                        value={defaults.socialUnlockTargetUrl || ""}
                        onChange={e => setDefaults(d => ({ ...d, socialUnlockTargetUrl: e.target.value }))}
                        placeholder="https://example.com/download"
                      />
                      <p className="text-xs text-muted-foreground mt-1">URL users unlock after completing actions</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Required Actions</label>
                      <div className="space-y-2">
                        {[
                          { key: "subscribe" as const, label: "Require Subscribe" },
                          { key: "like" as const, label: "Require Like" },
                          { key: "comment" as const, label: "Require Comment" },
                        ].map(action => (
                          <label key={action.key} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
                            <input type="checkbox"
                              checked={defaults.socialUnlockActions?.[action.key] || false}
                              onChange={e => setDefaults(d => ({
                                ...d,
                                socialUnlockActions: {
                                  ...(d.socialUnlockActions || { subscribe: true, like: true, comment: false }),
                                  [action.key]: e.target.checked,
                                },
                              }))}
                              className="rounded w-4 h-4" />
                            <span className="text-sm">{action.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>How it works:</strong> A smart link is auto-added to video descriptions. Viewers must complete required actions to unlock your target URL.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                onClick={() => {
                  saveUploadDefaults(null, defaults);
                  setDefaultsSaved(true);
                  toast.success("Upload defaults saved!");
                  setTimeout(() => setDefaultsSaved(false), 2000);
                }}
              >
                {defaultsSaved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null}
                Save Defaults
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <h2 className="font-display font-semibold text-foreground">General Settings</h2>
            <div className="space-y-4">
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
