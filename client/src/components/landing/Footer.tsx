import React from "react";
import { Bot, Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-slate-200 bg-slate-50 text-slate-900 py-12">
    <div className="container mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900">
            Omni<span className="text-primary font-extrabold">Agent</span>
          </span>
        </Link>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 font-medium" aria-label="Footer Navigation">
          <a href="#about" className="hover:text-slate-900 transition-colors">Overview</a>
          <a href="#interactive-demo" className="hover:text-slate-900 transition-colors">Simulator</a>
          <a href="#industries" className="hover:text-slate-900 transition-colors">Industry Studio</a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">Architecture</a>
          <a href="#features" className="hover:text-slate-900 transition-colors">Capabilities</a>
        </nav>

        {/* Socials */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className="size-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-xs"
          >
            <Github className="size-3.5" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter / X"
            className="size-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-xs"
          >
            <Twitter className="size-3.5" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="size-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-xs"
          >
            <Linkedin className="size-3.5" />
          </a>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
        <div>
          © {new Date().getFullYear()} OmniAgent. Precision Multi-Agent Engineering.
        </div>
        <div className="flex items-center gap-2 text-emerald-600 font-semibold">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>FastAPI + n8n Engines Operational</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
