import { motion } from "framer-motion";
import { Eye, Clock, ThumbsUp, Users, Youtube, AlertCircle } from "lucide-react";

const AnalyticsPage = () => {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Performance metrics across your connected accounts</p>
      </motion.div>

      {/* YouTube not connected */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto">
          <Youtube className="w-7 h-7 text-youtube" />
        </div>
        <div>
          <p className="font-display font-semibold text-foreground text-lg">YouTube Analytics</p>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Google account in Settings to view YouTube analytics
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Facebook & Instagram analytics are available on the <a href="/social" className="text-primary hover:underline">Facebook & IG</a> page.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsPage;
