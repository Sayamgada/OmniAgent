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