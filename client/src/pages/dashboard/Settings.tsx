import { motion } from "framer-motion";
import {
  Bell,
  Bot,
  Cpu,
  Lock,
  Monitor,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useAuth } from "../../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [temperature, setTemperature] = useState([0.7]);
  const [tokenLimit, setTokenLimit] = useState([4096]);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);

  const displayName =
    user?.full_name || user?.name || user?.email?.split("@")[0] || "User";
  const email = user?.email ?? "user@omniagent.io";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSave = () => toast.success("Workspace preferences saved successfully");

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto antialiased">
      {/* Header */}
      <div className="border-b border-border/80 pb-5">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>Workspace Environment Config</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Workspace <span className="gradient-text">Settings</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Manage workspace defaults, profile identity, and global LLM inference generation hyperparameters.
        </p>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="h-10 gap-1 rounded-xl border border-border/80 bg-card p-1">
          <TabsTrigger
            value="user"
            className="h-8 gap-1.5 rounded-lg px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <User className="size-3.5" />
            <span>Profile & Notifications</span>
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="h-8 gap-1.5 rounded-lg px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Sliders className="size-3.5" />
            <span>Global AI Inference Defaults</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile & Notifications */}
        <TabsContent value="user" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm"
          >
            {/* Identity Card */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
              <div className="flex items-center gap-3.5">
                <Avatar className="size-12 border border-primary/40 shadow-sm">
                  <AvatarFallback className="bg-primary/15 text-sm font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-foreground">{displayName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-border/80 bg-background/50 text-xs self-start sm:self-center rounded-lg"
                onClick={() => toast.info("Avatar customization coming soon")}
              >
                Change Avatar
              </Button>
            </div>

            {/* Profile Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">User Profile Information</h3>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-foreground">Full Name</Label>
                  <Input id="name" defaultValue={displayName} className="h-9 border-border/80 bg-background/50 text-xs rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
                  <Input id="email" type="email" defaultValue={email} className="h-9 border-border/80 bg-background/50 text-xs font-mono rounded-xl" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">Update Password</Label>
                  <Input id="password" type="password" placeholder="Leave blank to keep unchanged" className="h-9 border-border/80 bg-background/50 text-xs font-mono rounded-xl" />
                </div>
              </div>
            </div>

            {/* Appearance Theme */}
            <div className="space-y-3 border-t border-border/60 pt-5">
              <div className="flex items-center gap-2">
                <Monitor className="size-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Interface Appearance Mode</h3>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background/40 p-3.5">
                <div>
                  <p className="text-xs font-bold text-foreground">Active Theme</p>
                  <p className="text-[11px] text-muted-foreground">Toggle between high-contrast obsidian dark and crisp light mode.</p>
                </div>
                <Select value={theme || "dark"} onValueChange={(val) => setTheme(val)}>
                  <SelectTrigger className="w-32 h-8 border-border bg-card text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    <SelectItem value="dark" className="text-xs">Dark Obsidian</SelectItem>
                    <SelectItem value="light" className="text-xs">Light Mode</SelectItem>
                    <SelectItem value="system" className="text-xs">System Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-3 border-t border-border/60 pt-5">
              <div className="flex items-center gap-2">
                <Bell className="size-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Workspace Alert Channels</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background/40 p-3.5">
                  <div>
                    <Label htmlFor="email-notif" className="text-xs font-bold text-foreground cursor-pointer">Email Dispatch Notifications</Label>
                    <p className="text-[11px] text-muted-foreground">Receive execution digests and incident escalation alerts.</p>
                  </div>
                  <Switch id="email-notif" checked={emailNotif} onCheckedChange={setEmailNotif} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background/40 p-3.5">
                  <div>
                    <Label htmlFor="push-notif" className="text-xs font-bold text-foreground cursor-pointer">Real-time Browser Alerts</Label>
                    <p className="text-[11px] text-muted-foreground">Instant alerts when agent execution graphs finish or error.</p>
                  </div>
                  <Switch id="push-notif" checked={pushNotif} onCheckedChange={setPushNotif} />
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 flex justify-end">
              <Button
                onClick={handleSave}
                className="h-9 gap-1.5 bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg"
              >
                <span>Save Profile Preferences</span>
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* Tab 2: AI Model Defaults */}
        <TabsContent value="ai" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm"
          >
            <div className="flex items-start gap-3 border-b border-border/60 pb-5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <Cpu className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Global Inference Parameters</h3>
                <p className="text-xs text-muted-foreground">
                  Default generation hyperparameters applied when creating new agents and simulating execution chains.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Default Reasoning Model Engine</Label>
              <Select defaultValue="gpt-4o">
                <SelectTrigger className="h-9 max-w-sm border-border/80 bg-background/50 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="gpt-4o" className="text-xs">GPT-4o (Default Omniscient)</SelectItem>
                  <SelectItem value="claude" className="text-xs">Claude 3.5 Sonnet (Advanced Logic)</SelectItem>
                  <SelectItem value="gemini" className="text-xs">Gemini 1.5 Pro (Long Context)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-xl border border-border/80 bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground">Sampling Temperature</Label>
                  <p className="text-[11px] text-muted-foreground">Controls randomness vs determinism in reasoning output.</p>
                </div>
                <span className="font-mono text-xs font-bold text-primary rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5">
                  {temperature[0]}
                </span>
              </div>
              <Slider
                value={temperature}
                onValueChange={setTemperature}
                min={0}
                max={1}
                step={0.1}
                className="py-1"
              />
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>0.0 (Strict / Deterministic)</span>
                <span>1.0 (Creative / Exploratory)</span>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/80 bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground">Max Generation Tokens</Label>
                  <p className="text-[11px] text-muted-foreground">Upper ceiling for token allocation per node step.</p>
                </div>
                <span className="font-mono text-xs font-bold text-foreground rounded-lg border border-border bg-card px-2 py-0.5">
                  {tokenLimit[0]} tokens
                </span>
              </div>
              <Slider
                value={tokenLimit}
                onValueChange={setTokenLimit}
                min={512}
                max={8192}
                step={256}
                className="py-1"
              />
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>512</span>
                <span>8192</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Response Verbosity Style</Label>
              <Select defaultValue="balanced">
                <SelectTrigger className="h-9 max-w-sm border-border/80 bg-background/50 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="concise" className="text-xs">Concise (Compact bullet points)</SelectItem>
                  <SelectItem value="balanced" className="text-xs">Balanced (Standard enterprise detail)</SelectItem>
                  <SelectItem value="detailed" className="text-xs">Detailed (Exhaustive explanations)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border/60 pt-4 flex justify-end">
              <Button
                onClick={handleSave}
                className="h-9 gap-1.5 bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg"
              >
                <Sparkles className="size-3.5" />
                <span>Save AI Inference Parameters</span>
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
