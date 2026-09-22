import React from "react";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import { WhatIsOmniAgentSection } from "../components/landing/WhatIsOmniAgentSection";
import { WorkDisappearsSection } from "../components/landing/WorkDisappearsSection";
import { BeforeVsAfterSection } from "../components/landing/BeforeVsAfterSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";

const Index: React.FC = () => (
  <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-foreground transition-colors duration-350">
    {/* Navigation */}
    <Navbar />

    {/* 01 — HERO (Preserved untouched — 100vh-115vh AI Network + Scroll Transition) */}
    <HeroSection />

    {/* 02 — WHAT IS OMNIAGENT? (The Simple Promise + 3 Primary Domain Rows) */}
    <WhatIsOmniAgentSection />

    {/* 03 — THE WORK DISAPPEARS (Unboxed Full-Width Convergence Animation) */}
    <WorkDisappearsSection />

    {/* 04 — BEFORE VS AFTER (Scroll-Driven Typographic Noise-to-Signal Transition) */}
    <BeforeVsAfterSection />

    {/* 05 — HOW IT WORKS (Unboxed Intent -> Active Coordination -> Tangible Outcomes) */}
    <HowItWorksSection />

    {/* 06 — FINAL CTA: "WHAT WILL YOU BUILD?" */}
    <CtaSection />

    {/* 07 — FOOTER */}
    <Footer />
  </div>
);

export default Index;
