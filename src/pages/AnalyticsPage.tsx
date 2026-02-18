import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { Eye, ThumbsUp, MessageSquare, Clock, TrendingUp, Users, Youtube } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const viewsData = [
  { day: "Mon", views: 4200 }, { day: "Tue", views: 5100 }, { day: "Wed", views: 3800 },
  { day: "Thu", views: 6400 }, { day: "Fri", views: 7200 }, { day: "Sat", views: 8100 },
  { day: "Sun", views: 6900 },
];

const engagementData = [
  { day: "Mon", likes: 320, comments: 85 }, { day: "Tue", likes: 410, comments: 120 },
  { day: "Wed", likes: 290, comments: 65 }, { day: "Thu", likes: 520, comments: 145 },
  { day: "Fri", likes: 580, comments: 170 }, { day: "Sat", likes: 650, comments: 195 },
  { day: "Sun", likes: 540, comments: 160 },
];

const stats = [
  { title: "Total Views", value: "42.1K", change: "+18% vs last week", changeType: "positive" as const, icon: Eye, platform: "youtube" as const },
  { title: "Watch Time (hrs)", value: "1,284", change: "+8% vs last week", changeType: "positive" as const, icon: Clock, platform: "youtube" as const },
  { title: "Likes", value: "3,310", change: "+22% vs last week", changeType: "positive" as const, icon: ThumbsUp, platform: "youtube" as const },
  { title: "New Subscribers", value: "+248", change: "+5% vs last week", changeType: "positive" as const, icon: Users, platform: "youtube" as const },
];

const AnalyticsPage = () => {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Performance metrics across your connected accounts</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Views Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-5 shadow-card border border-border/50"
        >
          <h3 className="font-display font-semibold text-foreground mb-4">Views (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={viewsData}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(4, 80%, 58%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(4, 80%, 58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="hsl(215, 12%, 52%)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215, 12%, 52%)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 16%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }}
              />
              <Area type="monotone" dataKey="views" stroke="hsl(4, 80%, 58%)" fill="url(#viewsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Engagement Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-xl p-5 shadow-card border border-border/50"
        >
          <h3 className="font-display font-semibold text-foreground mb-4">Engagement (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={engagementData}>
              <XAxis dataKey="day" stroke="hsl(215, 12%, 52%)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215, 12%, 52%)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 16%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }}
              />
              <Bar dataKey="likes" fill="hsl(4, 80%, 58%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" fill="hsl(220, 70%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
