import { Bot, Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-background py-10">
    <div className="container mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            Omni<span className="text-primary">Agent</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground" aria-label="Footer Navigation">
          <a href="#about" className="hover:text-foreground transition-colors">Overview</a>
          <a href="#features" className="hover:text-foreground transition-colors">Capabilities</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#use-cases" className="hover:text-foreground transition-colors">Industries</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className="size-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Github className="size-4" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter / X"
            className="size-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Twitter className="size-4" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="size-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Linkedin className="size-4" />
          </a>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/60 text-center text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} OmniAgent. Precision Multi-Agent Engineering. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
