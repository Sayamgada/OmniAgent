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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative w-full max-w-[420px]"
    >
      <div className="relative rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
        </div>
        {children}
        {footer ? <div className="mt-6 border-t border-border pt-4">{footer}</div> : null}
      </div>
    </motion.div>
  );
};

export default AuthCard;
