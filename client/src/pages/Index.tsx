import React from "react";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import { DescribeSection } from "../components/landing/DescribeSection";
import { IdeaToExecutionSection } from "../components/landing/IdeaToExecutionSection";
import { DomainAdaptSection } from "../components/landing/DomainAdaptSection";
import { OutcomeSection } from "../components/landing/OutcomeSection";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";

const Index: React.FC = () => (
  <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-foreground transition-colors duration-350">
    {/* Navigation */}
    <Navbar />

    {/* 01 — HERO (Preserved untouched — 100vh-115vh AI Network + Scroll Transition) */}
    <HeroSection />

    {/* 02 — SECTION 1: "YOU DESCRIBE IT." (Flowing Transformation Stream Visual #1) */}
    <DescribeSection />

    {/* 03 — SECTION 2: "FROM AN IDEA TO SOMETHING THAT WORKS." (Effortless Flow Story) */}
    <IdeaToExecutionSection />

    {/* 04 — SECTION 3: "ONE INTELLIGENCE. MANY POSSIBILITIES." (Morphing Domain Visual #2) */}
    <DomainAdaptSection />

    {/* 05 — SECTION 4: "LESS ORCHESTRATION. MORE EXECUTION." (Outcome Typography & Value) */}
    <OutcomeSection />

    {/* 06 — FINAL CTA: "WHAT WILL YOU BUILD?" */}
    <CtaSection />

    {/* 07 — FOOTER */}
    <Footer />
  </div>
);

export default Index;
