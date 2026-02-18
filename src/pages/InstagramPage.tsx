import { motion } from "framer-motion";
import { Instagram, Eye, Heart, MessageCircle, Video, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";

const igVideos = [
  { title: "Reel: Quick Tips", views: "45.2K", likes: "3.8K", comments: 234 },
  { title: "Story Highlights", views: "12.1K", likes: "890", comments: 56 },
  { title: "IGTV: Deep Dive", views: "8.4K", likes: "520", comments: 78 },
];

const InstagramPage = () => {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Instagram</h1>
          <p className="text-muted-foreground">Manage your Instagram video content</p>
        </div>
        <Button className="bg-instagram text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          New Upload
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Views" value="65.7K" change="+28% this month" changeType="positive" icon={Eye} platform="instagram" />
        <StatCard title="Likes" value="5.2K" change="+18% this month" changeType="positive" icon={Heart} platform="instagram" />
        <StatCard title="Comments" value="368" change="+12% this month" changeType="positive" icon={MessageCircle} platform="instagram" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-xl shadow-card border border-border/50"
      >
        <div className="p-5 border-b border-border">
          <h2 className="font-display font-semibold text-foreground text-lg">Your Videos</h2>
        </div>
        <div className="divide-y divide-border">
          {igVideos.map((v) => (
            <div key={v.title} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Video className="w-5 h-5 text-instagram" />
                </div>
                <p className="text-sm font-medium text-foreground">{v.title}</p>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {v.views}</span>
                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {v.likes}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {v.comments}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default InstagramPage;
