import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, CheckCircle2, XCircle, Video, RefreshCw, Send, Sparkles, Hash, Clock, Type, CalendarClock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { getXAccountCount, verifyXAccount } from "@/lib/x-api";
import { suggestHashtags, suggestTweet, suggestBestTimes } from "@/lib/ai-suggest";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compressor";

interface AccountInfo {
  index: number;
  verified: boolean;
  username?: string;
  name?: string;
  loading: boolean;
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TwitterPage = () => {
  const [accountCount, setAccountCount] = useState(0);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [tweetText, setTweetText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI states
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [suggestedTweets, setSuggestedTweets] = useState<string[]>([]);
  const [bestTimes, setBestTimes] = useState<any[]>([]);

  // Schedule states
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadScheduledPosts();
  }, []);

  const loadScheduledPosts = async () => {
    setLoadingScheduled(true);
    const { data } = await supabase
      .from('scheduled_posts')
      .select('*')
      .order('scheduled_at', { ascending: true });
    setScheduledPosts(data || []);
    setLoadingScheduled(false);
  };

  const handleSchedulePost = async () => {
    if (!tweetText && !selectedFile) { toast.error("Add tweet text or select a video"); return; }
    if (selectedAccounts.length === 0) { toast.error("Select at least one account"); return; }
    if (!scheduleDate) { toast.error("Pick a date"); return; }

    const [hours, mins] = scheduleTime.split(':').map(Number);
    const scheduledAt = new Date(scheduleDate);
    scheduledAt.setHours(hours, mins, 0, 0);

    if (scheduledAt <= new Date()) { toast.error("Scheduled time must be in the future"); return; }

    let filePath = '';
    if (selectedFile) {
      toast.loading("Uploading video for scheduling...");
      filePath = `x-uploads/${Date.now()}_${selectedFile.name}`;
      const { error } = await supabase.storage.from('videos').upload(filePath, selectedFile);
      toast.dismiss();
      if (error) { toast.error(`Upload failed: ${error.message}`); return; }
    }

    const { error } = await supabase.from('scheduled_posts').insert({
      platform: 'twitter',
      account_indices: selectedAccounts,
      tweet_text: tweetText || null,
      video_path: filePath || null,
      scheduled_at: scheduledAt.toISOString(),
    });

    if (error) { toast.error(`Failed to schedule: ${error.message}`); return; }

    toast.success(`Scheduled for ${format(scheduledAt, "PPP 'at' p")}`);
    setTweetText("");
    setSelectedFile(null);
    setScheduleDate(undefined);
    setScheduleMode(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadScheduledPosts();
  };

  const deleteScheduledPost = async (id: string) => {
    await supabase.from('scheduled_posts').delete().eq('id', id);
    toast.success("Scheduled post deleted");
    loadScheduledPosts();
  };

  const loadAccounts = async () => {
    const res = await getXAccountCount();
    const count = (res as any).count || 0;
    if (res.success && count > 0) {
      setAccountCount(count);
      const accs: AccountInfo[] = Array.from({ length: count }, (_, i) => ({
        index: i, verified: false, loading: true,
      }));
      setAccounts(accs);

      for (let i = 0; i < count; i++) {
        verifyXAccount(i).then(vRes => {
          setAccounts(prev => prev.map(a =>
            a.index === i ? {
              ...a,
              loading: false,
              verified: vRes.success,
              username: vRes.data?.data?.username,
              name: vRes.data?.data?.name,
            } : a
          ));
        });
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const compressed = await compressImage(file, "twitter");
      if (compressed.size !== file.size) {
        toast.success(`Compressed: ${(file.size/1024/1024).toFixed(1)}MB → ${(compressed.size/1024/1024).toFixed(1)}MB`);
      }
      setSelectedFile(compressed);
    } else if (file.type.startsWith("video/")) {
      setSelectedFile(file);
    } else {
      toast.error("Please select a video or image file");
    }
  };

  const toggleAccount = (idx: number) => {
    setSelectedAccounts(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const selectAllAccounts = () => {
    const verified = accounts.filter(a => a.verified && a.index !== 0).map(a => a.index);
    if (selectedAccounts.length === verified.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(verified);
    }
  };

  const handleUpload = async () => {
    if (!tweetText && !selectedFile) {
      toast.error("Add tweet text or select a file");
      return;
    }

    // Manual share via X Web Intent. Free, no API needed.
    // If a file is attached, copy it to clipboard so user can paste it in compose window.
    setIsUploading(true);
    try {
      if (selectedFile) {
        try {
          // @ts-ignore — ClipboardItem typing
          const item = new ClipboardItem({ [selectedFile.type]: selectedFile });
          // @ts-ignore
          await navigator.clipboard.write([item]);
          toast.success("File copied to clipboard — paste (Ctrl/Cmd+V) in the X compose window");
        } catch {
          toast.warning("Couldn't copy file to clipboard. You'll need to attach the file manually in X.");
        }
      }
      const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
      window.open(intentUrl, "_blank", "noopener,noreferrer");
      toast.success("Opened X compose. Click 'Post' to publish.");
    } catch (err: any) {
      toast.error(err.message || "Failed to open X");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleAiHashtags = async () => {
    if (!tweetText) { toast.error("Enter some text first for context"); return; }
    setAiLoading('hashtags');
    const res = await suggestHashtags(tweetText, 'twitter');
    if (res.success && res.data?.hashtags) {
      setSuggestedHashtags(res.data.hashtags);
    } else {
      toast.error(res.error || "Failed to get suggestions");
    }
    setAiLoading(null);
  };

  const handleAiTweet = async () => {
    if (!tweetText) { toast.error("Enter a topic first"); return; }
    setAiLoading('tweet');
    const res = await suggestTweet(tweetText);
    if (res.success && res.data) {
      const tweets = [res.data.tweet, ...(res.data.alternatives || [])].filter(Boolean);
      setSuggestedTweets(tweets);
    } else {
      toast.error(res.error || "Failed to get suggestions");
    }
    setAiLoading(null);
  };

  const handleAiBestTimes = async () => {
    setAiLoading('times');
    const res = await suggestBestTimes(tweetText || 'gaming content', 'twitter');
    if (res.success && res.data?.times) {
      setBestTimes(res.data.times);
    } else {
      toast.error(res.error || "Failed to get suggestions");
    }
    setAiLoading(null);
  };

  const appendHashtags = (tags: string[]) => {
    const newText = tweetText + (tweetText ? '\n' : '') + tags.join(' ');
    if (newText.length <= 280) {
      setTweetText(newText);
      setSuggestedHashtags([]);
      toast.success("Hashtags added!");
    } else {
      toast.error("Adding hashtags would exceed 280 chars");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center text-background">
            <XIcon />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">X (Twitter) — Manual Share</h1>
            <p className="text-muted-foreground">X API got expensive — we now open the X compose window so posting stays free</p>
          </div>
        </div>
      </motion.div>

      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-foreground">
        <strong>How it works:</strong> Click <em>Open X to Post</em> and the X compose window opens with your text pre-filled.
        If you attach an image or video, we copy it to your clipboard — paste with Ctrl/Cmd+V in the compose window. Free, no API quota.
      </div>

      {/* Accounts */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border/50">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground text-lg">Connected Accounts</h2>
          <Button variant="outline" size="sm" onClick={loadAccounts}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
        <div className="p-4">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No X accounts configured. Add your credentials in backend secrets.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{selectedAccounts.length} of {accounts.filter(a => a.verified).length} selected</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllAccounts}>
                  {selectedAccounts.length === accounts.filter(a => a.verified).length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map(acc => (
                  <div key={acc.index} className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedAccounts.includes(acc.index) ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  } ${!acc.verified && !acc.loading ? 'opacity-50' : ''}`}
                    onClick={() => acc.verified && acc.index !== 0 && toggleAccount(acc.index)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedAccounts.includes(acc.index)}
                          onCheckedChange={() => acc.verified && acc.index !== 0 && toggleAccount(acc.index)}
                          disabled={!acc.verified || acc.loading || acc.index === 0}
                          className="flex-shrink-0"
                        />
                        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {acc.index + 1}
                        </div>
                        <div className="min-w-0">
                          {acc.loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : acc.verified ? (
                            <>
                              <p className="text-sm font-medium text-foreground truncate">@{acc.username}</p>
                              <p className="text-xs text-muted-foreground truncate">{acc.name}</p>
                            </>
                          ) : (
                            <p className="text-xs text-destructive">Not verified</p>
                          )}
                        </div>
                      </div>
                      {!acc.loading && (
                        acc.verified
                          ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Upload Form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-5">
        <h2 className="font-display font-semibold text-foreground text-lg">Post to X</h2>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Posting to <strong className="text-foreground">{selectedAccounts.length}</strong> account{selectedAccounts.length !== 1 ? 's' : ''}</span>
          {selectedAccounts.length > 0 && (
            <span className="text-xs">
              ({selectedAccounts.map(i => accounts.find(a => a.index === i)?.username ? `@${accounts.find(a => a.index === i)?.username}` : `#${i+1}`).join(', ')})
            </span>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Tweet Text</label>
          <Textarea
            value={tweetText}
            onChange={e => setTweetText(e.target.value)}
            placeholder="What's happening? (Enter a topic and use AI tools below)"
            rows={4}
            maxLength={280}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{tweetText.length}/280</p>
        </div>

        {/* AI Tools */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI Tools</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleAiHashtags} disabled={!!aiLoading}>
              {aiLoading === 'hashtags' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Hash className="w-3 h-3 mr-1" />}
              Suggest Hashtags
            </Button>
            <Button variant="outline" size="sm" onClick={handleAiTweet} disabled={!!aiLoading}>
              {aiLoading === 'tweet' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Type className="w-3 h-3 mr-1" />}
              Write Tweet
            </Button>
            <Button variant="outline" size="sm" onClick={handleAiBestTimes} disabled={!!aiLoading}>
              {aiLoading === 'times' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />}
              Best Post Times
            </Button>
          </div>

          {/* Hashtag suggestions */}
          {suggestedHashtags.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Suggested Hashtags</span>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => appendHashtags(suggestedHashtags)}>
                  Add All
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedHashtags.map((tag, i) => (
                  <button key={i} onClick={() => appendHashtags([tag])}
                    className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tweet suggestions */}
          {suggestedTweets.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <span className="text-xs font-medium text-foreground">Suggested Tweets</span>
              <div className="space-y-2">
                {suggestedTweets.map((tweet, i) => (
                  <button key={i} onClick={() => { setTweetText(tweet); setSuggestedTweets([]); toast.success("Tweet applied!"); }}
                    className="block w-full text-left text-sm p-2 rounded bg-background border border-border hover:border-primary/50 transition-colors">
                    {tweet}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Best times */}
          {bestTimes.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <span className="text-xs font-medium text-foreground">Best Posting Times</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bestTimes.slice(0, 6).map((t, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-background border border-border">
                    <span className="font-medium text-foreground">{t.day} {t.time}</span>
                    {t.reason && <p className="text-muted-foreground mt-0.5">{t.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Video (optional)</label>
          <div
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <Video className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Click to select an image or video</p>
                <p className="text-xs text-muted-foreground">Images auto-compressed to fit X's 5 MB limit</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
        </div>

        {uploadProgress && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-foreground">{uploadProgress}</span>
          </div>
        )}

        {/* Schedule toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
          <Checkbox checked={scheduleMode} onCheckedChange={(c) => setScheduleMode(!!c)} />
          <CalendarClock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Schedule for later</span>
        </div>

        {scheduleMode && (
          <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[160px] justify-start text-left">
                    {scheduleDate ? format(scheduleDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Time</label>
              <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-[130px] h-9" />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={isUploading || (!tweetText && !selectedFile)}
            className="flex-1 bg-foreground text-background hover:bg-foreground/90"
          >
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Open X to Post
          </Button>
        </div>
      </motion.div>

      {/* Scheduled Posts */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card border border-border/50">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground text-lg flex items-center gap-2">
            <CalendarClock className="w-5 h-5" /> Scheduled Posts
          </h2>
          <Button variant="outline" size="sm" onClick={loadScheduledPosts}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
        <div className="p-4">
          {loadingScheduled ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : scheduledPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No scheduled posts yet.</p>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map(post => (
                <div key={post.id} className="flex items-start justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        post.status === 'pending' ? 'bg-warning/10 text-warning' :
                        post.status === 'completed' ? 'bg-success/10 text-success' :
                        post.status === 'processing' ? 'bg-primary/10 text-primary' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {post.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.scheduled_at), "PPP 'at' p")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        → {(post.account_indices || []).length} account{(post.account_indices || []).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {post.tweet_text && <p className="text-sm text-foreground truncate">{post.tweet_text}</p>}
                    {post.video_path && <p className="text-xs text-muted-foreground">📹 Video attached</p>}
                    {post.results && (
                      <div className="mt-1 space-y-0.5">
                        {(post.results as any[]).map((r: any, i: number) => (
                          <p key={i} className={`text-xs ${r.success ? 'text-success' : 'text-destructive'}`}>
                            Account {(r.accountIndex || 0) + 1}: {r.success ? '✓ Posted' : `✗ ${r.error}`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  {post.status === 'pending' && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteScheduledPost(post.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TwitterPage;
