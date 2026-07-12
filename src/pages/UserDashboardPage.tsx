import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3, Cloud, Copy, ExternalLink, FileText, Files, Folder,
  Link2, LinkIcon, Lock, LogOut, Mail, MousePointerClick, Plus,
  Settings, Sparkles, Trash2, TrendingUp, Users,
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

type Tab = "overview" | "create" | "shortened";

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
  const [tab, setTab] = useState<Tab>("create");
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
    else setLinks((data as SmartLink[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalClicks = useMemo(() => links.reduce((a, l) => a + (l.clicks || 0), 0), [links]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dest) return;
    try { new URL(dest); } catch {
      toast.error("Enter a valid destination URL (include https://)"); return;
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
    setTab("shortened");
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
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/5 bg-[#0d0d0f] p-4">
        <Link to="/" className="flex items-center gap-2 px-2 py-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Cloud className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-lg">Creator Cloud</span>
        </Link>

        <nav className="space-y-1">
          <SideItem icon={<Lock className="w-4 h-4" />} label="Links" active />
          <SideItem icon={<LinkIcon className="w-4 h-4" />} label="Link-in-bio" muted />
          <SideItem icon={<Mail className="w-4 h-4" />} label="Email lists" muted />
          <SideItem icon={<Files className="w-4 h-4" />} label="Files" muted />
          <SideItem icon={<Settings className="w-4 h-4" />} label="Settings" muted />
        </nav>

        <div className="mt-8 mb-2 text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-2">
          Insights <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
        <nav className="space-y-1">
          <SideItem icon={<BarChart3 className="w-4 h-4" />} label="Analytics" muted />
          <SideItem icon={<Users className="w-4 h-4" />} label="Audience" muted />
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">Upgrade to Pro</div>
              <div className="text-[11px] text-gray-500 truncate">Unlock full analytics …</div>
            </div>
            <span className="text-[10px] font-bold text-gray-300 border border-white/10 rounded px-1.5 py-0.5">PRO</span>
          </div>
          <div className="text-xs text-gray-400 truncate px-1">{email || "signed in"}</div>
          <Button size="sm" variant="ghost" onClick={signOut} className="w-full justify-start text-gray-400 hover:text-white">
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-white/5 px-4 sm:px-8 flex items-center gap-3">
          <Lock className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg sm:text-xl font-semibold">
            Links <span className="text-gray-500 font-normal">— {tab === "create" ? "Create new link" : tab === "shortened" ? "Shortened links" : "Overview"}</span>
          </h1>
        </header>

        <div className="px-4 sm:px-8 pt-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <TabBtn active={tab === "overview"} onClick={() => setTab("overview")} icon={<FileText className="w-4 h-4" />}>Overview</TabBtn>
            <TabBtn active={tab === "create"} onClick={() => setTab("create")} icon={<Plus className="w-4 h-4" />}>Create</TabBtn>
            <TabBtn active={tab === "shortened"} onClick={() => setTab("shortened")} icon={<LinkIcon className="w-4 h-4" />}>Shortened links</TabBtn>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {tab === "overview" && (
            <div className="grid sm:grid-cols-3 gap-4 max-w-4xl">
              <StatCard icon={<Link2 className="w-4 h-4" />} label="Smart links" value={links.length} />
              <StatCard icon={<MousePointerClick className="w-4 h-4" />} label="Total clicks" value={totalClicks} />
              <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Plan" value="Free" />
            </div>
          )}

          {tab === "create" && (
            <div className="grid lg:grid-cols-2 gap-6 max-w-6xl">
              {/* Left: form */}
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#111114] p-5">
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    <PickBtn active icon={<LinkIcon className="w-3.5 h-3.5" />}>URL</PickBtn>
                    <PickBtn icon={<Folder className="w-3.5 h-3.5" />}>File</PickBtn>
                    <PickBtn icon={<FileText className="w-3.5 h-3.5" />}>Snippet</PickBtn>
                  </div>
                  <Input
                    placeholder="Enter a destination URL*"
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    required
                    className="bg-black/40 border-white/10 h-12 mb-3"
                  />
                  <Input
                    placeholder="Enter a title*"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-black/40 border-white/10 h-12"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111114] p-5">
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> ACTIONS
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-gray-500 w-4">1.</span>
                    <Input
                      placeholder="custom-slug (optional)"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      className="flex-1 bg-black/40 border-white/10"
                    />
                    <button type="button" className="text-gray-500 hover:text-red-400 p-2" onClick={() => setCustomSlug("")}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button type="button" className="w-full border border-dashed border-white/10 rounded-xl py-3 text-sm text-gray-400 hover:text-white hover:border-white/20 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add action
                  </button>
                </div>

                <p className="text-xs text-gray-500 px-1">
                  Your short URL will look like <span className="text-gray-300">{origin}/s/&lt;slug&gt;</span>
                </p>
              </form>

              {/* Right: preview */}
              <div className="lg:pl-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Preview</div>
                  <Button type="submit" onClick={handleCreate as any} disabled={creating} className="bg-white text-black hover:bg-gray-200 rounded-full px-5">
                    <Plus className="w-4 h-4 mr-1" /> Create
                  </Button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111114] p-6">
                  <div className="text-center text-sm text-gray-300 mb-4">Complete the actions to unlock</div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Unlock progress</span>
                    <span>0/0 done</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 mb-5" />
                  <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl py-3 flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" /> Unlock link
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "shortened" && (
            <div className="max-w-5xl">
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : links.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-14 text-center">
                  <Link2 className="w-6 h-6 mx-auto text-gray-500 mb-2" />
                  <p className="text-sm text-gray-400 mb-4">No smart links yet.</p>
                  <Button onClick={() => setTab("create")} className="bg-emerald-500 hover:bg-emerald-400 text-black">
                    <Plus className="w-4 h-4 mr-1" /> Create your first link
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden bg-[#111114]">
                  {links.map((l) => {
                    const short = `${origin}/s/${l.slug}`;
                    return (
                      <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-white/[0.02]">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{l.title || l.slug}</div>
                          <div className="text-xs text-gray-500 truncate">→ {l.destination_url}</div>
                          <a href={short} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline break-all">{short}</a>
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SideItem({ icon, label, active, muted }: { icon: React.ReactNode; label: string; active?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition ${
      active ? "bg-white/[0.06] text-white" : muted ? "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]" : "text-gray-300"
    }`}>
      {icon}{label}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active?: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${
      active ? "bg-white/[0.08] text-white" : "text-gray-400 hover:text-white"
    }`}>{icon}{children}</button>
  );
}

function PickBtn({ active, icon, children }: { active?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm border transition ${
      active ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-gray-400 hover:text-white"
    }`}>{icon}{children}</button>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111114] p-5">
      <div className="flex items-center gap-2 text-xs text-gray-400">{icon}{label}</div>
      <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
    </div>
  );
}
