import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

const CtaSection = () => (
  <section className="py-20 border-t border-border/60 bg-background relative">
    <div className="container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <div className="relative rounded-2xl border border-border bg-card p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 text-foreground">
            Ready to Build Your <span className="gradient-text">First AI Agent?</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-lg mx-auto">
            Design, compile, and deploy autonomous workflows tailored to your industry domain in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="h-11 px-8 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 glow-primary rounded-lg" asChild>
              <Link to="/sign-up">
                Start Building Free
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CtaSection;
