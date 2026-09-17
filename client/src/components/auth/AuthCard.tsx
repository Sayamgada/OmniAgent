import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Bot } from "lucide-react";

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
      className="relative w-full max-w-[440px]"
    >
      <div className="relative rounded-3xl border border-border/90 bg-card/90 p-7 sm:p-9 shadow-2xl backdrop-blur-2xl text-left">
        <div className="mb-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 text-primary mx-auto mb-3.5 shadow-sm">
            <Bot className="size-5" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">{subtitle}</p>
        </div>
        {children}
        {footer ? <div className="mt-6 border-t border-border/70 pt-4">{footer}</div> : null}
      </div>
    </motion.div>
  );
};

export default AuthCard;
