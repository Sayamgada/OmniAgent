import { Bot, Github, Twitter, Linkedin } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/30 py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Bot className="w-6 h-6 text-primary" />
          <span className="gradient-text">OmniAgent</span>
        </div>

        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#" className="hover:text-foreground transition-colors">About</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
        </div>

        <div className="flex items-center gap-4">
          {[Twitter, Github, Linkedin].map((Icon, i) => (
            <a key={i} href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:glow-primary transition-all">
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-border/20 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} OmniAgent. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
