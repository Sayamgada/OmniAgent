import { motion } from "framer-motion";
import { Briefcase, GraduationCap, Landmark, Mail, Calendar, FileText, BookOpen, HelpCircle, BarChart3, Receipt, Scale } from "lucide-react";

const useCases = [
  {
    icon: Briefcase,
    domain: "Corporate Operations",
    badge: "Enterprise Orchestration",
    badgeColor: "text-primary border-primary/30 bg-primary/10",
    description: "Automate cross-functional communication, scheduling logistics, and executive report synthesis.",
    items: [
      { icon: Mail, label: "Automated Inbox Priority & Drafting" },
      { icon: Calendar, label: "Smart Multi-Attendee Scheduling" },
      { icon: FileText, label: "Executive Summary & Brief Compilation" },
    ],
  },
  {
    icon: GraduationCap,
    domain: "Education",
    badge: "Learning & Tutoring",
    badgeColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    description: "Personalized study curricula, step-by-step concept explanations, and adaptive quiz generation.",
    items: [
      { icon: BookOpen, label: "Interactive Study Plan Synthesizer" },
      { icon: FileText, label: "Contextual Quiz & Exam Generation" },
      { icon: HelpCircle, label: "Socratic Doubt Resolution Engine" },
    ],
  },
  {
    icon: Landmark,
    domain: "Finance",
    badge: "Financial Intelligence",
    badgeColor: "text-secondary border-secondary/30 bg-secondary/10",
    description: "Analyze periodic statements, detect transactional anomalies, and maintain compliance auditing.",
    items: [
      { icon: BarChart3, label: "P&L Trend & Anomaly Detection" },
      { icon: Receipt, label: "Automated Expense Verification" },
      { icon: Scale, label: "Regulatory Policy & Compliance Checks" },
    ],
  },
];

const UseCasesSection = () => (
  <section id="use-cases" className="py-20 border-t border-border/60 bg-background/50 relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Specialized for <span className="gradient-text">Real Industry Workflows</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
          Pre-engineered domain intelligence tailored to industry-specific schemas and standards.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5">
        {useCases.map((uc, i) => (
          <motion.div
            key={uc.domain}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="rounded-xl border border-border bg-card/80 p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground">
                  <uc.icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${uc.badgeColor}`}>
                  {uc.badge}
                </span>
              </div>

              <h3 className="text-base font-bold mb-2 text-foreground">{uc.domain}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">{uc.description}</p>

              <div className="space-y-2.5 border-t border-border/70 pt-4">
                {uc.items.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <item.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default UseCasesSection;
