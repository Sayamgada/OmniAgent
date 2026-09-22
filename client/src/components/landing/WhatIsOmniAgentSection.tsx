import React from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

interface DomainItem {
  num: string;
  title: string;
  desc: string;
}

const DOMAIN_ITEMS: DomainItem[] = [
  {
    num: "01",
    title: "CORPORATE OPERATIONS",
    desc: "Emails · Scheduling · Reports · Internal workflows",
  },
  {
    num: "02",
    title: "EDUCATION",
    desc: "Study planning · Quizzes · Summaries · Academic support",
  },
  {
    num: "03",
    title: "FINANCE",
    desc: "Reports · Invoices · Reconciliation · Audit support",
  },
];

export const WhatIsOmniAgentSection: React.FC = () => {
  return (
    <section
      id="what-is-omniagent"
      className="relative min-h-[90vh] py-32 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/60 text-foreground transition-colors duration-350 flex flex-col justify-center overflow-hidden"
    >
      {/* Ambient background soft light */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Asymmetric Bold Typography */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-8"
          >
            <div className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              THE OMNIAGENT PROMISE
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-foreground leading-[0.96]">
              YOU HAVE
              <br />
              THE WORK.
              <span className="block my-4 sm:my-6 h-[1px] w-24 bg-primary/60" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-teal-400">
                OmniAgent
                <br />
                handles the
                <br />
                complexity.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed pt-2">
              Describe what you need in plain language. OmniAgent coordinates the tools, steps, and AI agents needed to turn that intent into execution.
            </p>
          </motion.div>

          {/* Right: Three Elegant Horizontal Domain Rows (No Cards!) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-5 flex flex-col justify-center divide-y divide-border/60"
          >
            {DOMAIN_ITEMS.map((domain) => (
              <div
                key={domain.num}
                className="py-8 group transition-all duration-300 hover:pl-2 cursor-default"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-mono text-muted-foreground font-semibold">
                      {domain.num}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {domain.title}
                    </h3>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pl-8 leading-relaxed font-medium">
                  {domain.desc}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
