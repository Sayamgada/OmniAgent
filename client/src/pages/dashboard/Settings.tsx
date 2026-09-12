import { motion } from "framer-motion";
import {
  Bell,
  Bot,
  Monitor,
  Sliders,
  Sparkles,
  User,
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

  const handleSave = () => toast.success("Settings saved successfully");

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div className="border-b border-border/80 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage workspace defaults, user profile, and LLM inference generation parameters.
        </p>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="h-9 gap-1 rounded-lg border border-border bg-card p-1">
          <TabsTrigger
            value="user"
            className="h-7 gap-1.5 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <User className="size-3.5" />
            Profile & Notifications
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="h-7 gap-1.5 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Sliders className="size-3.5" />
            AI Model Defaults
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 border border-primary/30">
                  <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-foreground">{displayName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-border bg-background/50 text-xs self-start sm:self-center"
                onClick={() => toast.info("Avatar customization coming soon")}
              >
                Change Avatar
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground">User Information</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-foreground">Full Name</Label>
                  <Input id="name" defaultValue={displayName} className="h-9 border-border bg-background/50 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-foreground">Email Address</Label>
                  <Input id="email" type="email" defaultValue={email} className="h-9 border-border bg-background/50 text-xs font-mono" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground">Update Password</Label>
                  <Input id="password" type="password" placeholder="Leave blank to keep unchanged" className="h-9 border-border bg-background/50 text-xs font-mono" />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-5">
              <div className="flex items-center gap-2">
                <Monitor className="size-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Interface Appearance</h3>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Theme Mode</p>
                  <p className="text-[11px] text-muted-foreground">Toggle between high-contrast obsidian dark and crisp light mode.</p>
                </div>
                <Select value={theme || "dark"} onValueChange={(val) => setTheme(val)}>
                  <SelectTrigger className="w-32 h-8 border-border bg-card text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    <SelectItem value="dark" className="text-xs">Dark</SelectItem>
                    <SelectItem value="light" className="text-xs">Light</SelectItem>
                    <SelectItem value="system" className="text-xs">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-5">
              <div className="flex items-center gap-2">
                <Bell className="size-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Workspace Notifications</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                  <div>
                    <Label htmlFor="email-notif" className="text-xs font-semibold text-foreground cursor-pointer">Email Notifications</Label>
                    <p className="text-[11px] text-muted-foreground">Receive incident alerts and weekly workflow analytics digests.</p>
                  </div>
                  <Switch id="email-notif" checked={emailNotif} onCheckedChange={setEmailNotif} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                  <div>
                    <Label htmlFor="push-notif" className="text-xs font-semibold text-foreground cursor-pointer">Browser Notifications</Label>
                    <p className="text-[11px] text-muted-foreground">Real-time alerts when agent runs complete or encounter validation errors.</p>
                  </div>
                  <Switch id="push-notif" checked={pushNotif} onCheckedChange={setPushNotif} />
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 flex justify-end">
              <Button
                onClick={handleSave}
                className="h-9 gap-1.5 bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                Save Profile Preferences
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex items-start gap-3 border-b border-border/60 pb-5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <Bot className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Global Inference Parameters</h3>
                <p className="text-xs text-muted-foreground">
                  Default generation hyperparameters applied when creating new agents and simulating execution chains.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Default Reasoning Model</Label>
              <Select defaultValue="gpt-4o">
                <SelectTrigger className="h-9 max-w-sm border-border bg-background/50 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="gpt-4o" className="text-xs">GPT-4o (Default Omniscient)</SelectItem>
                  <SelectItem value="claude" className="text-xs">Claude 3.5 Sonnet (Advanced Logic)</SelectItem>
                  <SelectItem value="gemini" className="text-xs">Gemini 1.5 Pro (Long Context)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Sampling Temperature</Label>
                  <p className="text-[11px] text-muted-foreground">Controls randomness vs determinism in reasoning output.</p>
                </div>
                <span className="font-mono text-xs font-bold text-primary rounded border border-primary/30 bg-primary/10 px-2 py-0.5">
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

            <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Max Generation Tokens</Label>
                  <p className="text-[11px] text-muted-foreground">Upper ceiling for token allocation per node step.</p>
                </div>
                <span className="font-mono text-xs font-bold text-foreground rounded border border-border bg-card px-2 py-0.5">
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
              <Label className="text-xs font-medium text-foreground">Response Verbosity Style</Label>
              <Select defaultValue="balanced">
                <SelectTrigger className="h-9 max-w-sm border-border bg-background/50 text-xs">
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
                className="h-9 gap-1.5 bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                <Sparkles className="size-3.5" />
                Save AI Settings
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
