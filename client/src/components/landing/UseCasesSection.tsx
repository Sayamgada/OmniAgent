import { motion } from "framer-motion";
import { Building, GraduationCap, DollarSign, Mail, CalendarDays, FileText, BookOpen, HelpCircle, PieChart, Receipt, Scale } from "lucide-react";

const useCases = [
  {
    icon: Building,
    title: "Corporate Operations",
    color: "text-primary",
    items: [
      { icon: Mail, label: "Email Automation" },
      { icon: CalendarDays, label: "Smart Scheduling" },
      { icon: FileText, label: "Report Generation" },
    ],
  },
  {
    icon: GraduationCap,
    title: "Education",
    color: "text-secondary",
    items: [
      { icon: BookOpen, label: "Notes & Summaries" },
      { icon: FileText, label: "Quiz Generation" },
      { icon: HelpCircle, label: "Doubt Solving" },
    ],
  },
  {
    icon: DollarSign,
    title: "Finance",
    color: "text-primary",
    items: [
      { icon: PieChart, label: "Financial Reports" },
      { icon: Receipt, label: "Expense Analysis" },
      { icon: Scale, label: "Compliance Help" },
    ],
  },
];

const UseCasesSection = () => (
  <section id="use-cases" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Built for <span className="gradient-text">Every Industry</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Domain-specific AI agents tailored to your sector's unique needs.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {useCases.map((uc, i) => (
          <motion.div
            key={uc.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="glass-card-hover rounded-2xl p-8"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <uc.icon className={`w-7 h-7 ${uc.color}`} />
            </div>
            <h3 className="text-xl font-bold mb-6">{uc.title}</h3>
            <div className="space-y-4">
              {uc.items.map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-muted-foreground">
                  <item.icon className="w-4 h-4 text-primary/70" />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default UseCasesSection;
