import { motion } from "framer-motion";
import { Upload as UploadIcon, Youtube, Facebook, Instagram, Film, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

const accounts = [
  { id: "1", name: "Main Channel", platform: "youtube", icon: Youtube },
  { id: "2", name: "Tutorials Channel", platform: "youtube", icon: Youtube },
  { id: "3", name: "Company Page", platform: "facebook", icon: Facebook },
  { id: "4", name: "Brand Account", platform: "instagram", icon: Instagram },
];

const UploadPage = () => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

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
        onDrop={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
            <UploadIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Drop your video here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">MP4, MOV, AVI up to 10GB</p>
          </div>
          <Button variant="outline" size="sm" className="mt-2">
            <Plus className="w-4 h-4 mr-2" />
            Select File
          </Button>
        </div>
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

      {/* Account selection */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4"
      >
        <h2 className="font-display font-semibold text-foreground text-lg">Upload Destinations</h2>
        <p className="text-sm text-muted-foreground">Select accounts to upload to simultaneously</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((acc) => (
            <label
              key={acc.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedAccounts.includes(acc.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <Checkbox
                checked={selectedAccounts.includes(acc.id)}
                onCheckedChange={() => toggleAccount(acc.id)}
              />
              <acc.icon className={`w-4 h-4 text-${acc.platform}`} />
              <span className="text-sm font-medium text-foreground">{acc.name}</span>
            </label>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3"
      >
        <Button size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90">
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
