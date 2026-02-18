import { motion } from "framer-motion";
import { Upload as UploadIcon, Facebook, Instagram, Film, X, FileVideo, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { getFacebookPages, getInstagramAccount } from "@/lib/facebook-api";
import { getYouTubeChannels } from "@/lib/youtube-api";
import { publishToFacebook, publishToInstagram, uploadToYouTube } from "@/lib/publish-api";
import { supabase } from "@/integrations/supabase/client";
import VideoPreview from "@/components/VideoPreview";

interface UploadDestination {
  id: string;
  name: string;
  platform: "facebook" | "instagram" | "youtube";
  picture?: string;
  pageId?: string;
  pageAccessToken?: string;
  igAccountId?: string;
  channelTokenId?: string;
}

interface PublishResult {
  destinationName: string;
  platform: string;
  success: boolean;
  error?: string;
}

const YtIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-youtube" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const UploadPage = () => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [destinations, setDestinations] = useState<UploadDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [results, setResults] = useState<PublishResult[]>([]);

  useEffect(() => {
    const loadDestinations = async () => {
      setLoadingDestinations(true);
      const dests: UploadDestination[] = [];

      // Load FB/IG pages
      const res = await getFacebookPages();
      if (res.success) {
        const pages = res.data?.data || [];
        for (const page of pages) {
          dests.push({
            id: `fb-${page.id}`,
            name: page.name,
            platform: "facebook",
            picture: page.picture?.data?.url,
            pageId: page.id,
            pageAccessToken: page.access_token,
          });

          const igRes = await getInstagramAccount(page.id, page.access_token);
          if (igRes.success && igRes.data?.instagram_business_account) {
            const ig = igRes.data.instagram_business_account;
            dests.push({
              id: `ig-${ig.id}`,
              name: ig.name || ig.username || page.name,
              platform: "instagram",
              picture: ig.profile_picture_url,
              pageId: page.id,
              pageAccessToken: page.access_token,
              igAccountId: ig.id,
            });
          }
        }
      }

      // Load all YouTube channels
      const ytRes = await getYouTubeChannels();
      if (ytRes.success && ytRes.data?.channels) {
        for (const ch of ytRes.data.channels) {
          dests.push({
            id: `yt-${ch.id}`,
            name: ch.channelTitle || 'YouTube Channel',
            platform: "youtube",
            channelTokenId: ch.id,
          });
        }
      }

      setDestinations(dests);
      setLoadingDestinations(false);
    };

    loadDestinations();
  }, []);

  const handleFileSelect = (file: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload MP4, MOV, AVI, or WebM.");
      return;
    }
    setSelectedFile(file);
    toast.success(`Selected: ${file.name}`);
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedAccounts.length === destinations.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(destinations.map(d => d.id));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error("Please select a video file."); return; }
    if (selectedAccounts.length === 0) { toast.error("Please select at least one destination."); return; }
    if (!title.trim()) { toast.error("Please enter a video title."); return; }

    setUploading(true);
    setResults([]);
    const publishResults: PublishResult[] = [];

    try {
      setUploadProgress('Uploading video to storage...');
      const ext = selectedFile.name.split('.').pop() || 'mp4';
      const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(storagePath, selectedFile, { contentType: selectedFile.type });

      if (uploadError) {
        toast.error(`Storage upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(storagePath);

      toast.success('Video uploaded to storage!');

      const selected = destinations.filter(d => selectedAccounts.includes(d.id));

      for (const dest of selected) {
        setUploadProgress(`Publishing to ${dest.name} (${dest.platform})...`);

        if (dest.platform === 'facebook' && dest.pageId && dest.pageAccessToken) {
          const res = await publishToFacebook(dest.pageId, dest.pageAccessToken, publicUrl, title, description);
          publishResults.push({ destinationName: dest.name, platform: 'Facebook', success: res.success, error: res.error });
        } else if (dest.platform === 'instagram' && dest.igAccountId && dest.pageAccessToken) {
          const caption = `${title}\n\n${description}${tags ? '\n\n' + tags.split(',').map(t => `#${t.trim()}`).join(' ') : ''}`;
          const res = await publishToInstagram(dest.igAccountId, dest.pageAccessToken, publicUrl, caption);
          publishResults.push({ destinationName: dest.name, platform: 'Instagram', success: res.success, error: res.error });
        } else if (dest.platform === 'youtube') {
          const tagArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
          const res = await uploadToYouTube(storagePath, title, description, tagArray, privacy);
          publishResults.push({ destinationName: dest.name, platform: 'YouTube', success: res.success, error: res.error });
        }
      }

      setResults(publishResults);
      const successCount = publishResults.filter(r => r.success).length;
      if (successCount === publishResults.length) {
        toast.success(`Published to all ${successCount} destinations!`);
      } else {
        toast.warning(`Published to ${successCount}/${publishResults.length} destinations.`);
      }

      await supabase.storage.from('videos').remove([storagePath]);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Upload Video</h1>
        <p className="text-muted-foreground">Upload to Facebook, Instagram, and YouTube simultaneously</p>
      </motion.div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        {selectedFile ? (
          <div className="space-y-3">
            <VideoPreview file={selectedFile} />
            {!uploading && (
              <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                <X className="w-4 h-4 mr-2" /> Remove video
              </Button>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileSelect(file); }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                <UploadIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Drop your video here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">MP4, MOV, AVI, WebM</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5"
      >
        <h2 className="font-display font-semibold text-foreground text-lg">Video Details</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Title *</label>
            <Input placeholder="Enter video title" value={title} onChange={e => setTitle(e.target.value)} disabled={uploading} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
            <Textarea placeholder="Enter video description" rows={4} value={description} onChange={e => setDescription(e.target.value)} disabled={uploading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tags</label>
              <Input placeholder="gaming, tutorial, roblox" value={tags} onChange={e => setTags(e.target.value)} disabled={uploading} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Privacy (YouTube)</label>
              <Select value={privacy} onValueChange={setPrivacy} disabled={uploading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Destinations */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-foreground text-lg">Upload Destinations</h2>
            <p className="text-sm text-muted-foreground">Select where to publish this video</p>
          </div>
          {destinations.length > 1 && (
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedAccounts.length === destinations.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {loadingDestinations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : destinations.length === 0 ? (
          <div className="py-4 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No destinations available. Check your connections in Settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {destinations.map((dest) => (
              <label
                key={dest.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAccounts.includes(dest.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Checkbox
                  checked={selectedAccounts.includes(dest.id)}
                  onCheckedChange={() => toggleAccount(dest.id)}
                  disabled={uploading}
                />
                {dest.picture ? (
                  <img src={dest.picture} alt="" className="w-5 h-5 rounded-full" />
                ) : dest.platform === "instagram" ? (
                  <Instagram className="w-4 h-4 text-instagram" />
                ) : dest.platform === "youtube" ? (
                  <YtIcon />
                ) : (
                  <Facebook className="w-4 h-4 text-facebook" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{dest.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{dest.platform}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </motion.div>

      {/* Upload button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {uploading ? (
          <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">{uploadProgress}</p>
          </div>
        ) : (
          <Button
            size="lg"
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            onClick={handleUpload}
            disabled={!selectedFile || selectedAccounts.length === 0 || !title.trim()}
          >
            <UploadIcon className="w-4 h-4 mr-2" />
            Upload to {selectedAccounts.length} Destination{selectedAccounts.length !== 1 ? "s" : ""}
          </Button>
        )}

        {results.length > 0 && (
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 space-y-3">
            <h3 className="font-display font-semibold text-foreground">Upload Results</h3>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                {r.success ? (
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.destinationName} ({r.platform})</p>
                  {r.error && <p className="text-xs text-destructive mt-0.5 truncate">{r.error}</p>}
                  {r.success && <p className="text-xs text-success mt-0.5">Published successfully!</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default UploadPage;
