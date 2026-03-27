import { type ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
};

const AuthPageShell = ({ children }: AuthPageShellProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#121212] text-[#F5F5F5]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(211_100%_50%_/_0.18),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,hsl(122_39%_49%_/_0.08),transparent_45%)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#121212_100%)]" />
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute size-1 rounded-full bg-primary/35 animate-float"
            style={{
              left: `${(i * 7 + 13) % 100}%`,
              top: `${(i * 11) % 100}%`,
              animationDelay: `${i * 0.35}s`,
              animationDuration: `${5 + (i % 4)}s`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default AuthPageShell;
