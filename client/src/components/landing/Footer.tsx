import { Bot, Github, Twitter, Linkedin, Zap, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border/80 bg-background py-12">
    <div className="container mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            Omni<span className="text-primary font-extrabold">Agent</span>
          </span>
        </Link>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium" aria-label="Footer Navigation">
          <a href="#about" className="hover:text-foreground transition-colors">Overview</a>
          <a href="#interactive-demo" className="hover:text-foreground transition-colors">Simulator</a>
          <a href="#industries" className="hover:text-foreground transition-colors">Industry Studio</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">Architecture</a>
          <a href="#features" className="hover:text-foreground transition-colors">Capabilities</a>
        </nav>

        {/* Socials */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className="size-8 rounded-lg border border-border/80 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Github className="size-3.5" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter / X"
            className="size-8 rounded-lg border border-border/80 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Twitter className="size-3.5" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="size-8 rounded-lg border border-border/80 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Linkedin className="size-3.5" />
          </a>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground/70">
        <div>
          © {new Date().getFullYear()} OmniAgent. Precision Multi-Agent Engineering.
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>FastAPI + n8n Engines Operational</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
