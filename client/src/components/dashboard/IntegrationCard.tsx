import { motion } from "framer-motion";
import { Key, Settings2 } from "lucide-react";
import { toast } from "sonner";

import type { IntegrationCatalogItem } from "../../lib/api/integrations.ts";
import { toggleIntegration } from "../../lib/api/integrations.ts";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

import type { LucideIcon } from "lucide-react";
import {
  Mail, MessageSquare, MessageCircle, Send, Users, Smartphone,
  Calendar, CalendarDays, Contact, CheckSquare, FileText, Trello,
  CheckCircle2, LayoutGrid, ListChecks, HardDrive, Cloud, Package,
  Database, FolderInput, Table, Flame, FileSpreadsheet, BookOpen,
  Github, Gitlab, GitBranch, Settings, Wallet, CreditCard, Receipt,
  TrendingUp, Magnet, Twitter, Linkedin, Facebook, Instagram, Youtube,
  ClipboardList, Globe, Share2, Webhook, Rss, Search, Map, CloudSun,
  ShieldCheck, Boxes, Workflow, Sparkles, Zap, Wind, Route, Cpu, Link2,
} from "lucide-react";

export const integrationIcons: Record<string, LucideIcon> = {
  gmail: Mail, outlook: Mail, smtp_email: Send, slack: MessageSquare,
  microsoft_teams: Users, discord: MessageCircle, telegram: Send,
  twilio_sms: Smartphone, whatsapp: MessageCircle,

  google_calendar: Calendar, outlook_calendar: CalendarDays,
  google_contacts: Contact, google_tasks: CheckSquare, notion: FileText,
  trello: Trello, asana: CheckCircle2, clickup: CheckSquare,
  monday: LayoutGrid, todoist: ListChecks,

  drive: HardDrive, dropbox: Package, onedrive: Cloud, box: Package,
  amazon_s3: Database, ftp_sftp: FolderInput,

  postgresql: Database, mysql: Database, mongodb: Database, redis: Database,
  sqlite: Database, supabase: Database, airtable: Table, firebase: Flame,

  google_docs: FileText, google_sheets: FileSpreadsheet,
  microsoft_excel_online: FileSpreadsheet, microsoft_word_online: FileText,
  confluence: BookOpen, gitbook: BookOpen,

  github: Github, gitlab: Gitlab, bitbucket: GitBranch, jira: Trello,
  jenkins: Settings, azure_devops: Cloud, docker: Package,

  salesforce: Cloud, hubspot: Magnet, zoho_crm: Users, pipedrive: TrendingUp,
  freshsales: Users,

  stripe: CreditCard, razorpay: CreditCard, paypal: Wallet,
  quickbooks: Receipt, xero: Receipt,

  x_twitter: Twitter, linkedin: Linkedin, facebook: Facebook,
  instagram_business: Instagram, youtube: Youtube, reddit: MessageCircle,
  pinterest: Share2,

  google_forms: ClipboardList, typeform: ClipboardList, jotform: ClipboardList,
  tally: ClipboardList, formstack: ClipboardList,

  http: Globe, graphql: Share2, webhook: Webhook, rss_feed: Rss,
  serpapi: Search, tavily: Search, brave_search: Search,
  google_custom_search: Search,

  google_maps: Map, mapbox: Map, openweather: CloudSun, weatherapi: CloudSun,

  auth0: ShieldCheck, clerk: ShieldCheck, firebase_authentication: ShieldCheck,
  keycloak: ShieldCheck, okta: ShieldCheck,

  faiss_vector_store: Boxes, n8n_workflow_engine: Workflow,

  openai: Sparkles, anthropic: Sparkles, gemini: Sparkles, groq: Zap,
  cohere: Sparkles, mistral: Wind, huggingface: Smartphone,
  openrouter: Route, ollama: Cpu,
};

export const DefaultIntegrationIcon = Link2;

type IntegrationCardProps = {
  integration: IntegrationCatalogItem;
  index?: number;
  onToggled: (service: string, connected: boolean) => void;
  onConfigure: (integration: IntegrationCatalogItem) => void;
};

export function IntegrationCard({ integration, index = 0, onToggled, onConfigure }: IntegrationCardProps) {
  const { token } = useAuth();
  const Icon = integrationIcons[integration.service] ?? DefaultIntegrationIcon;

  const handleToggle = async () => {
    try {
      const result = await toggleIntegration(token, integration.service);
      onToggled(integration.service, result.connected);
      toast.success(
        result.connected ? `Connected to ${integration.display_name}` : `Disconnected from ${integration.display_name}`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update integration");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className={cn(
        "glass-card-hover rounded-2xl p-5 transition-all duration-300",
        integration.connected && "border-primary/20 shadow-[0_0_24px_hsl(211_100%_50%_/_0.12)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{integration.display_name}</h3>
            <p className="text-xs text-muted-foreground">{integration.category}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            integration.connected
              ? "border-secondary/40 bg-secondary/10 text-secondary"
              : "border-muted-foreground/30 text-muted-foreground"
          )}
        >
          {integration.connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{integration.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onConfigure(integration)}>
          <Key className="h-3.5 w-3.5" />
          Edit Keys
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Permissions
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{integration.connected ? "On" : "Off"}</span>
          <Switch checked={integration.connected} onCheckedChange={handleToggle} />
        </div>
      </div>
    </motion.div>
  );
}