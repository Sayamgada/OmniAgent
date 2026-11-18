import { motion } from "framer-motion";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

const AuthCard = ({ title, subtitle, children, footer }: AuthCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-[440px] sm:max-w-[460px]"
    >
      <div className="relative rounded-2xl sm:rounded-3xl border border-border/80 bg-card/90 p-7 sm:p-9 shadow-2xl backdrop-blur-2xl transition-colors duration-300">
        <div className="mb-7 text-center flex flex-col items-center">
          {/* Eyebrow Pill matching OmniAgent landing identity */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-primary mb-3 shadow-xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span>OmniAgent Core</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-sm">
            {subtitle}
          </p>
        </div>

        {children}

        {footer ? (
          <div className="mt-7 border-t border-border/60 pt-5">{footer}</div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default AuthCard;
