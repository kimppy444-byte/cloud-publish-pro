import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, CheckCircle2, XCircle, Video, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getXAccountCount, verifyXAccount, uploadAndTweet, tweetTextOnly } from "@/lib/x-api";
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
  const [selectedAccount, setSelectedAccount] = useState("0");
  const [tweetText, setTweetText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const res = await getXAccountCount();
    if (res.success && res.data?.count) {
      const count = res.data.count;
      setAccountCount(count);
      const accs: AccountInfo[] = Array.from({ length: count }, (_, i) => ({
        index: i, verified: false, loading: true,
      }));
      setAccounts(accs);

      // Verify each account in parallel
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

  const handleUpload = async () => {
    if (!tweetText && !selectedFile) {
      toast.error("Add tweet text or select a video");
      return;
    }

    setIsUploading(true);
    const idx = parseInt(selectedAccount);

    try {
      if (selectedFile) {
        // Upload video to Supabase storage first
        setUploadProgress("Uploading video to storage...");
        const filePath = `x-uploads/${Date.now()}_${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, selectedFile);
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        // Now upload to X
        setUploadProgress("Uploading to X (this may take a while)...");
        const res = await uploadAndTweet(idx, filePath, tweetText);
        if (res.success) {
          toast.success("Video posted to X successfully!");
          setTweetText("");
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
          toast.error(res.error || "Failed to post to X");
        }
      } else {
        // Text-only tweet
        setUploadProgress("Posting tweet...");
        const res = await tweetTextOnly(idx, tweetText);
        if (res.success) {
          toast.success("Tweet posted!");
          setTweetText("");
        } else {
          toast.error(res.error || "Failed to post tweet");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.map(acc => (
                <div key={acc.index} className={`p-3 rounded-lg border transition-colors ${
                  selectedAccount === acc.index.toString() ? "border-primary bg-primary/5" : "border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSelectedAccount(acc.index.toString())} className="flex items-center gap-2 text-left flex-1">
                      <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
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
                    </button>
                    {!acc.loading && (
                      acc.verified
                        ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Upload Form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-5">
        <h2 className="font-display font-semibold text-foreground text-lg">Post to X</h2>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Account</label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(acc => (
                <SelectItem key={acc.index} value={acc.index.toString()}>
                  Account {acc.index + 1} {acc.username ? `(@${acc.username})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Tweet Text</label>
          <Textarea
            value={tweetText}
            onChange={e => setTweetText(e.target.value)}
            placeholder="What's happening?"
            rows={4}
            maxLength={280}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{tweetText.length}/280</p>
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
          disabled={isUploading || (!tweetText && !selectedFile)}
          className="w-full bg-foreground text-background hover:bg-foreground/90"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {selectedFile ? "Upload & Tweet" : "Post Tweet"}
        </Button>
      </motion.div>
    </div>
  );
};

export default TwitterPage;
