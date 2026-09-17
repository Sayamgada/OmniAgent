import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Cpu,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  Landmark,
  Mail,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button";

type DomainInfo = {
  id: "corporate" | "education" | "finance";
  label: string;
  badge: string;
  badgeStyle: string;
  icon: typeof Briefcase;
  tagline: string;
  description: string;
  guardrails: string;
  tools: string[];
  useCases: { title: string; desc: string; icon: typeof Mail }[];
  samplePipeline: string[];
};

const domains: DomainInfo[] = [
  {
    id: "corporate",
    label: "Corporate Operations",
    badge: "Enterprise Orchestration",
    badgeStyle: "text-primary border-primary/30 bg-primary/10",
    icon: Briefcase,
    tagline: "Cross-Functional Ops & Governance",
    description: "Automate cross-functional communication, scheduling logistics, SLA compliance checks, and executive report synthesis.",
    guardrails: "Strict role-based access control, GDPR/SOC2 compliance isolation, and verified internal knowledge base anchoring.",
    tools: ["Gmail", "Google Calendar", "Slack", "Notion", "PostgreSQL", "Jira"],
    useCases: [
      { title: "Inbox Priority & Automated Response", desc: "Extract action items, draft contextual replies, and auto-flag executive escalations.", icon: Mail },
      { title: "Multi-Attendee Scheduling Coordinator", desc: "Analyze calendars, resolve timezone conflicts, and auto-book rooms & invites.", icon: Calendar },
      { title: "Executive Report & Document Synthesis", desc: "Synthesize operational metrics across departments into verified bullet briefings.", icon: FileText },
    ],
    samplePipeline: ["Email Ingestion", "Policy Extraction", "Calendar Scheduling", "Confirmation Dispatch"],
  },
  {
    id: "education",
    label: "Education & Research",
    badge: "Academic & Tutoring",
    badgeStyle: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    icon: GraduationCap,
    tagline: "Pedagogy & Curriculum Intelligence",
    description: "Personalized study curricula, step-by-step concept explanations, citation-backed fact validation, and adaptive quiz generation.",
    guardrails: "Pedagogical alignment with curriculum standards, strict citation verification, and hallucination reduction filters.",
    tools: ["Canvas LMS", "Google Docs", "Notion", "FAISS Vector Search", "OpenAI", "Webhook"],
    useCases: [
      { title: "Interactive Study Path Synthesizer", desc: "Build tailored week-by-week learning modules based on target exam syllabi.", icon: BookOpen },
      { title: "Adaptive Quiz & Rubric Generator", desc: "Generate multi-tier assessment items with verified answer rationales.", icon: FileCheck },
      { title: "Socratic Doubt Resolution Engine", desc: "Guide students through problem solving with progressive hints rather than direct answers.", icon: HelpCircle },
    ],
    samplePipeline: ["Curriculum Ingestion", "Pedagogy Reasoning", "Assessment Synthesis", "LMS Portal Sync"],
  },
  {
    id: "finance",
    label: "Financial Services",
    badge: "Financial Intelligence",
    badgeStyle: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    icon: Landmark,
    tagline: "Audit-Ready Numeric Intelligence",
    description: "Analyze periodic statements, detect transactional anomalies, reconcile itemized ledgers, and maintain audit compliance.",
    guardrails: "Deterministic numeric validation, strict threshold assertions, and immutable audit logs.",
    tools: ["QuickBooks", "Stripe", "PostgreSQL", "Slack", "Google Sheets", "PDF OCR"],
    useCases: [
      { title: "P&L Trend & Anomaly Detection", desc: "Scan transactional streams, flag statistical outliers, and identify variance spikes.", icon: BarChart3 },
      { title: "Itemized Expense Audit Verification", desc: "Parse PDF invoices, match line items to expense policies, and flag discrepancies.", icon: Receipt },
      { title: "Regulatory Policy & Audit Checkers", desc: "Automate compliance validations against financial rules with deterministic logs.", icon: Scale },
    ],
    samplePipeline: ["Invoice Parsing", "Variance Detection", "Policy Verification", "Slack Escalation"],
  },
];

const UseCasesSection = () => {
  const [activeTab, setActiveTab] = useState<"corporate" | "education" | "finance">("corporate");

  const current = domains.find((d) => d.id === activeTab) ?? domains[0];
  const Icon = current.icon;

  return (
    <section id="industries" className="py-24 border-t border-border/80 bg-background/50 relative">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-xs font-mono font-medium text-primary mb-3">
            <Cpu className="size-3" />
            <span>Domain Intelligence Studio</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            Specialized For <span className="gradient-text">Real Industry Workflows</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Generic AI models fail in production. OmniAgent embeds pre-calibrated domain intelligence, schema guardrails, and compliance rules tailored to your industry.
          </p>
        </motion.div>

        {/* Domain Navigation Ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {domains.map((d) => {
            const DIcon = d.icon;
            const isSelected = d.id === activeTab;
            return (
              <button
                key={d.id}
                onClick={() => setActiveTab(d.id)}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-card border border-primary text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.15)] ring-1 ring-primary/40"
                    : "border border-border/80 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                <div className={`flex size-6 items-center justify-center rounded-lg ${isSelected ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                  <DIcon className="size-3.5" />
                </div>
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Domain Stage */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-border/90 bg-card/90 p-6 sm:p-8 backdrop-blur-2xl max-w-6xl mx-auto shadow-xl"
          >
            {/* Top Domain Context Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border/70 pb-6 mb-8">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{current.label}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-medium ${current.badgeStyle}`}>
                    {current.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  {current.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-9 gap-1.5 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg" asChild>
                  <Link to="/new-agent">
                    <span>Create {current.label.split(" ")[0]} Agent</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Three Pillar Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {current.useCases.map((uc, i) => {
                const UcIcon = uc.icon;
                return (
                  <div
                    key={uc.title}
                    className="rounded-xl border border-border/80 bg-background/50 p-4 flex flex-col justify-between hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/25 text-primary mb-3">
                        <UcIcon className="size-4" />
                      </div>
                      <h4 className="font-bold text-xs text-foreground mb-1.5">{uc.title}</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{uc.desc}</p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span className="text-primary font-medium">Use Case 0{i + 1}</span>
                      <span className="text-emerald-400">Verified</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Pipeline & Guardrails Bar */}
            <div className="grid lg:grid-cols-2 gap-4 border-t border-border/70 pt-6 text-xs">
              <div className="rounded-xl border border-border/80 bg-background/40 p-4">
                <div className="flex items-center gap-2 text-foreground font-bold mb-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Domain Guardrails & Compliance Policy</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {current.guardrails}
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-background/40 p-4">
                <div className="flex items-center gap-2 text-foreground font-bold mb-2">
                  <Zap className="size-4 text-primary" />
                  <span>Integrated Service Connectors</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {current.tools.map((t) => (
                    <span key={t} className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default UseCasesSection;
