import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Youtube, Facebook, Instagram, Key, User, Upload, Settings as SettingsIcon, Trash2, Plus } from "lucide-react";

const connectedAccounts = [
  { name: "Main Channel", platform: "YouTube", icon: Youtube, email: "main@example.com" },
  { name: "Tutorials Channel", platform: "YouTube", icon: Youtube, email: "tutorials@example.com" },
  { name: "Company Page", platform: "Facebook", icon: Facebook, email: "company@example.com" },
  { name: "Brand Account", platform: "Instagram", icon: Instagram, email: "brand@example.com" },
];

const SettingsPage = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your accounts, defaults, and API configuration</p>
      </motion.div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="w-4 h-4 mr-2" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="defaults" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Upload className="w-4 h-4 mr-2" />
            Upload Defaults
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Key className="w-4 h-4 mr-2" />
            API Clients
          </TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <SettingsIcon className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border/50">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-semibold text-foreground">Connected Accounts</h2>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Connect Account
              </Button>
            </div>
            <div className="divide-y divide-border">
              {connectedAccounts.map((acc) => (
                <div key={acc.name} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <acc.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{acc.platform} · {acc.email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* Upload Defaults Tab */}
        <TabsContent value="defaults">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <h2 className="font-display font-semibold text-foreground">Default Upload Settings</h2>
            <p className="text-sm text-muted-foreground">These defaults will be applied to all new uploads</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Title Template</label>
                <Input placeholder="e.g., {date} - New Video" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Description</label>
                <Textarea placeholder="Enter default description template" rows={4} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Tags</label>
                <Input placeholder="tech, tutorial, coding" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-apply defaults</p>
                  <p className="text-xs text-muted-foreground">Apply these defaults to all new uploads automatically</p>
                </div>
                <Switch />
              </div>
              <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90">Save Defaults</Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* API Clients Tab */}
        <TabsContent value="api">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <h2 className="font-display font-semibold text-foreground">API Credentials</h2>
            <p className="text-sm text-muted-foreground">Manage your API keys for each platform</p>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-youtube" />
                  <span className="text-sm font-medium text-foreground">YouTube Data API v3</span>
                </div>
                <Input placeholder="Google OAuth Client ID" type="password" />
                <Input placeholder="Google OAuth Client Secret" type="password" />
              </div>
              <div className="p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-facebook" />
                  <span className="text-sm font-medium text-foreground">Facebook Graph API</span>
                </div>
                <Input placeholder="App ID" type="password" />
                <Input placeholder="App Secret" type="password" />
                <p className="text-xs text-success flex items-center gap-1">● Connected</p>
              </div>
              <div className="p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-instagram" />
                  <span className="text-sm font-medium text-foreground">Instagram Graph API</span>
                </div>
                <Input placeholder="Uses Facebook App credentials" disabled />
                <p className="text-xs text-muted-foreground">Instagram API uses your Facebook app credentials</p>
              </div>
            </div>
            <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90">Save API Settings</Button>
          </motion.div>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <h2 className="font-display font-semibold text-foreground">General Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
                <Input placeholder="Your name" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input placeholder="your@email.com" type="email" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium text-foreground">Email notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified when uploads complete</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-publish</p>
                  <p className="text-xs text-muted-foreground">Automatically publish after processing</p>
                </div>
                <Switch />
              </div>
              <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90">Save Settings</Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
