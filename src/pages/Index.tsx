import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { Youtube, Facebook, Instagram, Eye, ThumbsUp, Upload, Users, TrendingUp, Video } from "lucide-react";

const stats = [
  { title: "Total Views", value: "1.24M", change: "+12.5% this month", changeType: "positive" as const, icon: Eye },
  { title: "Subscribers", value: "48.2K", change: "+3.2% this month", changeType: "positive" as const, icon: Users },
  { title: "Videos Uploaded", value: "342", change: "8 this week", changeType: "neutral" as const, icon: Video },
  { title: "Engagement Rate", value: "4.8%", change: "+0.6% this month", changeType: "positive" as const, icon: TrendingUp },
];

const recentUploads = [
  { title: "How to Build a SaaS in 2026", platform: "YouTube", status: "Published", views: "12.4K", time: "2h ago" },
  { title: "Quick Tips for Content Creators", platform: "Facebook", status: "Processing", views: "—", time: "5h ago" },
  { title: "Behind the Scenes #24", platform: "Instagram", status: "Published", views: "8.1K", time: "1d ago" },
  { title: "Product Launch Announcement", platform: "YouTube", status: "Scheduled", views: "—", time: "Tomorrow" },
];

const platformIcon = (p: string) => {
  if (p === "YouTube") return <Youtube className="w-4 h-4 text-youtube" />;
  if (p === "Facebook") return <Facebook className="w-4 h-4 text-facebook" />;
  return <Instagram className="w-4 h-4 text-instagram" />;
};

const statusColor = (s: string) => {
  if (s === "Published") return "text-success";
  if (s === "Processing") return "text-warning";
  return "text-muted-foreground";
};

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your content across all platforms</p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Platform overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { name: "YouTube", icon: Youtube, color: "youtube" as const, channels: 3, videos: 248 },
          { name: "Facebook", icon: Facebook, color: "facebook" as const, channels: 2, videos: 56 },
          { name: "Instagram", icon: Instagram, color: "instagram" as const, channels: 4, videos: 38 },
        ].map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="bg-card rounded-xl p-5 shadow-card border border-border/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-${p.color}`}>
                <p.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.channels} accounts connected</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{p.videos} videos</span>
              <span className="text-success">● Active</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent uploads */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-card rounded-xl shadow-card border border-border/50"
      >
        <div className="p-5 border-b border-border">
          <h2 className="font-display font-semibold text-foreground text-lg">Recent Uploads</h2>
        </div>
        <div className="divide-y divide-border">
          {recentUploads.map((u) => (
            <div key={u.title} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {platformIcon(u.platform)}
                <div>
                  <p className="text-sm font-medium text-foreground">{u.title}</p>
                  <p className="text-xs text-muted-foreground">{u.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className={statusColor(u.status)}>{u.status}</span>
                <span className="text-muted-foreground w-16 text-right">{u.views}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
