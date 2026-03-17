import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, CheckCircle2, XCircle, Video, RefreshCw, Send, Sparkles, Hash, Clock, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getXAccountCount, verifyXAccount, uploadAndTweet, tweetTextOnly } from "@/lib/x-api";
import { suggestHashtags, suggestTweet, suggestBestTimes } from "@/lib/ai-suggest";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    loadAccounts();
  }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file");
        return;
      }
      setSelectedFile(file);
    }
  };

  const toggleAccount = (idx: number) => {
    setSelectedAccounts(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const selectAllAccounts = () => {
    const verified = accounts.filter(a => a.verified).map(a => a.index);
    if (selectedAccounts.length === verified.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(verified);
    }
  };

  const handleUpload = async () => {
    if (!tweetText && !selectedFile) {
      toast.error("Add tweet text or select a video");
      return;
    }
    if (selectedAccounts.length === 0) {
      toast.error("Select at least one account");
      return;
    }

    setIsUploading(true);
    let filePath = '';

    try {
      if (selectedFile) {
        setUploadProgress("Uploading video to storage...");
        filePath = `x-uploads/${Date.now()}_${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, selectedFile);
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      let successCount = 0;
      let failCount = 0;

      for (const idx of selectedAccounts) {
        const accLabel = accounts.find(a => a.index === idx)?.username || `Account ${idx + 1}`;
        if (selectedFile) {
          setUploadProgress(`Posting video to @${accLabel}...`);
          const res = await uploadAndTweet(idx, filePath, tweetText);
          if (res.success) successCount++;
          else { failCount++; toast.error(`@${accLabel}: ${res.error || "Failed"}`); }
        } else {
          setUploadProgress(`Posting tweet to @${accLabel}...`);
          const res = await tweetTextOnly(idx, tweetText);
          if (res.success) successCount++;
          else { failCount++; toast.error(`@${accLabel}: ${res.error || "Failed"}`); }
        }
      }

      if (successCount > 0) {
        toast.success(`Posted to ${successCount} account${successCount > 1 ? 's' : ''}!`);
        setTweetText("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      if (failCount > 0 && successCount === 0) {
        toast.error("All posts failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
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
            <h1 className="text-3xl font-display font-bold text-foreground">X (Twitter)</h1>
            <p className="text-muted-foreground">Upload videos and post tweets</p>
          </div>
        </div>
      </motion.div>

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
                          onCheckedChange={() => acc.verified && toggleAccount(acc.index)}
                          disabled={!acc.verified || acc.loading}
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
                <p className="text-sm text-muted-foreground">Click to select a video</p>
                <p className="text-xs text-muted-foreground">MP4 recommended, max 512MB</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
        </div>

        {uploadProgress && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-foreground">{uploadProgress}</span>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={isUploading || (!tweetText && !selectedFile) || selectedAccounts.length === 0}
          className="w-full bg-foreground text-background hover:bg-foreground/90"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {selectedFile ? `Upload & Tweet to ${selectedAccounts.length} Account${selectedAccounts.length !== 1 ? 's' : ''}` : `Post to ${selectedAccounts.length} Account${selectedAccounts.length !== 1 ? 's' : ''}`}
        </Button>
      </motion.div>
    </div>
  );
};

export default TwitterPage;
