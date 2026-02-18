import { motion } from "framer-motion";
import { Upload as UploadIcon, Facebook, Instagram, Film, Plus, X, FileVideo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { getFacebookPages, getInstagramAccount } from "@/lib/facebook-api";

interface UploadDestination {
  id: string;
  name: string;
  platform: "facebook" | "instagram";
  picture?: string;
  igUsername?: string;
}

const UploadPage = () => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [destinations, setDestinations] = useState<UploadDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);

  useEffect(() => {
    const loadDestinations = async () => {
      setLoadingDestinations(true);
      const res = await getFacebookPages();
      if (!res.success) {
        setLoadingDestinations(false);
        return;
      }
      const pages = res.data?.data || [];
      const dests: UploadDestination[] = [];

      for (const page of pages) {
        dests.push({
          id: `fb-${page.id}`,
          name: page.name,
          platform: "facebook",
          picture: page.picture?.data?.url,
        });

        // Check for linked Instagram account
        const igRes = await getInstagramAccount(page.id, page.access_token);
        if (igRes.success && igRes.data?.instagram_business_account) {
          const ig = igRes.data.instagram_business_account;
          dests.push({
            id: `ig-${ig.id}`,
            name: ig.name || ig.username || page.name,
            platform: "instagram",
            picture: ig.profile_picture_url,
            igUsername: ig.username,
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

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Upload Video</h1>
        <p className="text-muted-foreground">Upload to multiple platforms simultaneously</p>
      </motion.div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileSelect(file); }}
        onClick={() => fileInputRef.current?.click()}
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
        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileVideo className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
              <UploadIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Drop your video here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">MP4, MOV, AVI, WebM up to 10GB</p>
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Select File
            </Button>
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
            <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
            <Input placeholder="Enter video title" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
            <Textarea placeholder="Enter video description" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="tech">Science & Technology</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Privacy</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select privacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Tags</label>
            <Input placeholder="Enter tags separated by commas" />
          </div>
        </div>
      </motion.div>

      {/* Account selection - now using REAL pages */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4"
      >
        <h2 className="font-display font-semibold text-foreground text-lg">Upload Destinations</h2>
        <p className="text-sm text-muted-foreground">Select pages to upload to simultaneously</p>

        {loadingDestinations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : destinations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No connected pages found. Check your Facebook API key configuration.</p>
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
                />
                {dest.picture ? (
                  <img src={dest.picture} alt="" className="w-5 h-5 rounded-full" />
                ) : dest.platform === "instagram" ? (
                  <Instagram className="w-4 h-4 text-instagram" />
                ) : (
                  <Facebook className="w-4 h-4 text-facebook" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{dest.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {dest.platform}{dest.igUsername ? ` · @${dest.igUsername}` : ''}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3"
      >
        <Button size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          onClick={() => {
            if (!selectedFile) { toast.error("Please select a video file first."); return; }
            if (selectedAccounts.length === 0) { toast.error("Please select at least one destination."); return; }
            toast.info("Video upload coming soon! The Facebook API requires additional setup for video publishing.");
          }}
        >
          <UploadIcon className="w-4 h-4 mr-2" />
          Upload to {selectedAccounts.length || 0} Account{selectedAccounts.length !== 1 ? "s" : ""}
        </Button>
        <Button variant="outline" size="lg">
          <Film className="w-4 h-4 mr-2" />
          Edit Video First
        </Button>
      </motion.div>
    </div>
  );
};

export default UploadPage;
