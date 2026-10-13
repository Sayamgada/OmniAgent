import React from "react";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import { WhatIsOmniAgentSection } from "../components/landing/WhatIsOmniAgentSection";
import { WorkDisappearsSection } from "../components/landing/WorkDisappearsSection";
import { BeforeVsAfterSection } from "../components/landing/BeforeVsAfterSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";

/**
 * OmniAgent Landing Page
 * Official Design System: Theme 02 — Obsidian Bronze
 *
 * Sequence:
 * 01 — Hero (Cinematic AI Network Canvas & Scroll-Driven Ignition)
 * 02 — What is OmniAgent (Core Promise & 3 Domain Rows)
 * 03 — The Work Disappears (Convergence Transformation)
 * 04 — Before vs After (Noise-to-Signal Typographic Transition)
 * 05 — How It Works (Autonomous Multi-Agent Coordination Pipeline)
 * 06 — CTA (Direct Plain Language Intent Entry)
 * 07 — Footer
 */
const Index: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground selection:bg-primary/25 selection:text-foreground">
      {/* Sticky Global Navigation */}
      <Navbar />

      {/* 01 — HERO WITH CINEMATIC AI NETWORK CANVAS & SCROLL TRANSITION */}
      <HeroSection />

      {/* 02 — WHAT IS OMNIAGENT (Intent + 3 Domain Rows) */}
      <WhatIsOmniAgentSection />

      {/* 03 — THE WORK DISAPPEARS (Unboxed Convergence Animation) */}
      <WorkDisappearsSection />

      {/* 04 — BEFORE VS AFTER (Typographic Transition) */}
      <BeforeVsAfterSection />

      {/* 05 — HOW IT WORKS (Particle Stream Coordination Pipeline) */}
      <HowItWorksSection />

      {/* 06 — CTA INTENT ENTRY */}
      <CtaSection />

      {/* 07 — FOOTER */}
      <Footer />
    </div>
  );
};

export default Index;
