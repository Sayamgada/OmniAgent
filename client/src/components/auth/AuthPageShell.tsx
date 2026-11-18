import { type ReactNode } from "react";
import { useSiteTheme } from "../../context/ThemeContext";

type AuthPageShellProps = {
  children: ReactNode;
};

const AuthPageShell = ({ children }: AuthPageShellProps) => {
  const { landingTheme } = useSiteTheme();

  return (
    <div
      className={`relative min-h-screen w-full ${landingTheme} bg-background text-foreground transition-colors duration-300 overflow-x-hidden flex flex-col justify-between selection:bg-primary/25 selection:text-foreground`}
    >
      {/* Ambient background atmosphere matching OmniAgent landing page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Central warm primary glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[500px] bg-primary/8 rounded-full blur-[190px] transition-colors duration-300" />
        
        {/* Lower subtle secondary/accent glow */}
        <div className="absolute bottom-12 right-1/4 w-[450px] h-[350px] bg-secondary/10 rounded-full blur-[160px] transition-colors duration-300" />

        {/* Subtle perspective dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035] transition-opacity duration-300"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1">{children}</div>
    </div>
  );
};

export default AuthPageShell;
