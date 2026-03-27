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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-[440px]"
    >
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-90"
        style={{
          background: "linear-gradient(135deg, hsl(211 100% 50% / 0.45), hsl(0 0% 16% / 0.8), hsl(122 39% 49% / 0.35))",
          filter: "blur(0.5px)",
        }}
      />
      <div
        className="relative rounded-2xl border border-[#2A2A2A] bg-[#1E1E1E]/90 p-8 shadow-[0_0_80px_-20px_hsl(211_100%_50%_/_0.35)] backdrop-blur-xl md:p-10"
        style={{ boxShadow: "inset 0 1px 0 0 hsl(0 0% 100% / 0.04)" }}
      >
        <div className="mb-8 text-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#007BFF]/90">OmniAgent</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F5F5] md:text-[1.65rem]">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        {children}
        {footer ? <div className="mt-8 border-t border-[#2A2A2A]/80 pt-6">{footer}</div> : null}
      </div>
    </motion.div>
  );
};

export default AuthCard;
