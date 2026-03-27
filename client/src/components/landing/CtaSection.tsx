import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";

const CtaSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <div className="absolute -inset-8 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 rounded-3xl blur-3xl" />
        <div className="relative glass-card rounded-2xl p-12 md:p-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Start Building Your First AI Agent{" "}
            <span className="gradient-text">Today</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Join thousands of teams using OmniAgent to automate workflows and unlock AI-powered productivity.
          </p>
          <Button size="lg" className="glow-primary-strong text-base px-10 py-6 animate-gradient-shift bg-gradient-to-r from-primary to-secondary">
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CtaSection;
