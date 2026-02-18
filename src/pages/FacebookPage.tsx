import { motion } from "framer-motion";
import { Facebook, Upload, Video, Eye, ThumbsUp, Share2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";

const fbVideos = [
  { title: "Product Launch Teaser", views: "23.4K", likes: "1.2K", shares: 342, status: "Published" },
  { title: "Behind the Scenes", views: "8.7K", likes: "456", shares: 89, status: "Published" },
  { title: "Tutorial: Getting Started", views: "15.2K", likes: "890", shares: 215, status: "Published" },
];

const FacebookPage = () => {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Facebook</h1>
          <p className="text-muted-foreground">Manage and upload videos to your Facebook pages</p>
        </div>
        <Button className="bg-facebook text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          New Upload
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Views" value="47.3K" change="+15% this month" changeType="positive" icon={Eye} platform="facebook" />
        <StatCard title="Total Likes" value="2.5K" change="+8% this month" changeType="positive" icon={ThumbsUp} platform="facebook" />
        <StatCard title="Total Shares" value="646" change="+22% this month" changeType="positive" icon={Share2} platform="facebook" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-xl shadow-card border border-border/50"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground text-lg">Your Videos</h2>
          <Button variant="ghost" size="sm" className="text-facebook">
            <Upload className="w-4 h-4 mr-2" /> Upload to Instagram
          </Button>
        </div>
        <div className="divide-y divide-border">
          {fbVideos.map((v) => (
            <div key={v.title} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Video className="w-5 h-5 text-facebook" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{v.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {v.views}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> {v.likes}</span>
                <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> {v.shares}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default FacebookPage;
