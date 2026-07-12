import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Cloud, Copy, ExternalLink, Link2, LogOut, MousePointerClick,
  Plus, Sparkles, Trash2, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type SmartLink = {
  id: string;
  slug: string;
  title: string | null;
  destination_url: string;
  clicks: number;
  created_at: string;
};

const randomSlug = (len = 6) => {
  const alpha = "abcdefghijkmnopqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
};

export default function UserDashboardPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dest, setDest] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    setEmail(userRes.user?.email ?? "");
    const { data, error } = await supabase
      .from("user_smart_links")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setLinks(data as SmartLink[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalClicks = useMemo(() => links.reduce((a, l) => a + (l.clicks || 0), 0), [links]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dest) return;
    try {
      new URL(dest);
    } catch {
      toast.error("Enter a valid destination URL (include https://)");
      return;
    }
    setCreating(true);
    const slug = (customSlug || randomSlug()).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { setCreating(false); return; }
    const { data, error } = await supabase
      .from("user_smart_links")
      .insert({ user_id: uid, slug, destination_url: dest, title: title || null })
      .select()
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setLinks([data as SmartLink, ...links]);
    setTitle(""); setDest(""); setCustomSlug("");
    toast.success("Smart link created");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("user_smart_links").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setLinks(links.filter(l => l.id !== id));
    toast.success("Link deleted");
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Creator Cloud</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-gray-500">{email}</span>
            <Button size="sm" variant="outline" onClick={signOut} className="border-white/10 bg-transparent">
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Your dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Create smart links, share them, and track clicks in real time.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={<Link2 className="w-4 h-4" />} label="Smart links" value={links.length} />
          <StatCard icon={<MousePointerClick className="w-4 h-4" />} label="Total clicks" value={totalClicks} />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Plan" value="Free" />
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <h2 className="font-semibold">Create a new smart link</h2>
          </div>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-6 gap-3">
            <Input
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sm:col-span-2 bg-black/40 border-white/10"
            />
            <Input
              placeholder="https://your-destination.com"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              required
              className="sm:col-span-2 bg-black/40 border-white/10"
            />
            <Input
              placeholder="custom-slug (optional)"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              className="sm:col-span-1 bg-black/40 border-white/10"
            />
            <Button type="submit" disabled={creating} className="sm:col-span-1 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-3">
            Your short URL will look like <span className="text-gray-300">{origin}/s/&lt;slug&gt;</span>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Your smart links</h2>
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : links.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <Link2 className="w-6 h-6 mx-auto text-gray-500 mb-2" />
              <p className="text-sm text-gray-400">No smart links yet. Create your first one above.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {links.map((l) => {
                const short = `${origin}/s/${l.slug}`;
                return (
                  <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-white/[0.02]">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{l.title || l.slug}</div>
                      <div className="text-xs text-gray-500 truncate">→ {l.destination_url}</div>
                      <a href={short} target="_blank" rel="noreferrer" className="text-xs text-orange-400 hover:underline break-all">
                        {short}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="tabular-nums">{l.clicks} clicks</span>
                      <Button size="sm" variant="outline" className="h-8 border-white/10 bg-transparent" onClick={() => copy(short)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <a href={short} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="h-8 border-white/10 bg-transparent">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" className="h-8 border-white/10 bg-transparent text-red-400 hover:text-red-300" onClick={() => handleDelete(l.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-xs text-gray-400">{icon}{label}</div>
      <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
    </div>
  );
}
