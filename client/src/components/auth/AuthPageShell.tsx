import { type ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
};

const AuthPageShell = ({ children }: AuthPageShellProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-primary/10 rounded-full blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default AuthPageShell;
