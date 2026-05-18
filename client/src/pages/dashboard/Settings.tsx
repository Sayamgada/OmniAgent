import { motion } from "framer-motion";
import {
  Bell,
  Key,
  Monitor,
  Shield,
  Sliders,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

const sessions = [
  { id: "1", device: "Chrome on Windows", location: "New York, US", current: true, lastActive: "Active now" },
  { id: "2", device: "Safari on iPhone", location: "New York, US", current: false, lastActive: "2 days ago" },
];

const activityLogs = [
  { action: "Agent created", detail: "HR Policy Assistant", time: "2 hours ago" },
  { action: "API key rotated", detail: "OpenAI integration", time: "1 day ago" },
  { action: "Login", detail: "Chrome on Windows", time: "3 days ago" },
];

export default function Settings() {
  const { user } = useAuth();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, AI preferences, and security
        </p>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="glass-card h-auto flex-wrap gap-1 rounded-xl p-1">
          <TabsTrigger value="user" className="gap-2 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <User className="h-4 w-4" />
            User
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Sliders className="h-4 w-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card space-y-6 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/20 text-lg text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{displayName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Change Avatar
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue={displayName} className="bg-muted/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={email} className="bg-muted/30" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" placeholder="••••••••" className="bg-muted/30" />
              </div>
            </div>

            <div className="space-y-4 border-t border-border/50 pt-6">
              <h3 className="flex items-center gap-2 font-medium">
                <Monitor className="h-4 w-4 text-primary" />
                Theme
              </h3>
              <Select defaultValue="dark">
                <SelectTrigger className="max-w-xs bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark (Premium AI)</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 border-t border-border/50 pt-6">
              <h3 className="flex items-center gap-2 font-medium">
                <Bell className="h-4 w-4 text-primary" />
                Notifications
              </h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notif">Email notifications</Label>
                <Switch id="email-notif" checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notif">Push notifications</Label>
                <Switch id="push-notif" checked={pushNotif} onCheckedChange={setPushNotif} />
              </div>
            </div>

            <Button onClick={handleSave}>Save Changes</Button>
          </motion.div>
        </TabsContent>

        <TabsContent value="ai">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card space-y-6 rounded-2xl p-6"
          >
            <div className="space-y-2">
              <Label>Default AI Model</Label>
              <Select defaultValue="gpt-4o">
                <SelectTrigger className="max-w-sm bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                  <SelectItem value="gemini">Gemini 1.5 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground">{temperature[0]}</span>
              </div>
              <Slider
                value={temperature}
                onValueChange={setTemperature}
                min={0}
                max={1}
                step={0.1}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Token Limit</Label>
                <span className="text-sm text-muted-foreground">{tokenLimit[0]}</span>
              </div>
              <Slider
                value={tokenLimit}
                onValueChange={setTokenLimit}
                min={512}
                max={8192}
                step={256}
              />
            </div>

            <div className="space-y-2">
              <Label>Response Style</Label>
              <Select defaultValue="balanced">
                <SelectTrigger className="max-w-sm bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave}>Save AI Settings</Button>
          </motion.div>
        </TabsContent>

        <TabsContent value="security">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="glass-card rounded-2xl p-6">
              <h3 className="mb-4 font-semibold">Active Sessions</h3>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-4"
                  >
                    <div>
                      <p className="font-medium">{session.device}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.location} · {session.lastActive}
                      </p>
                    </div>
                    {session.current ? (
                      <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs text-secondary">
                        Current
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success("Session revoked")}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Key className="h-4 w-4 text-primary" />
                API Keys
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Manage API keys for programmatic access to OmniAgent
              </p>
              <Button variant="outline" onClick={() => toast.info("API key generation coming soon")}>
                Generate New Key
              </Button>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="mb-4 font-semibold">Activity Log</h3>
              <div className="space-y-2">
                {activityLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border/30 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
