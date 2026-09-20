import React from "react";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import { DescribeSection } from "../components/landing/DescribeSection";
import { IdeaToExecutionSection } from "../components/landing/IdeaToExecutionSection";
import { DomainAdaptSection } from "../components/landing/DomainAdaptSection";
import { OutcomeSection } from "../components/landing/OutcomeSection";
import { ExperimentalSection01 } from "../components/landing/experiments/ExperimentalSection01";
import { ExperimentalSection02 } from "../components/landing/experiments/ExperimentalSection02";
import { ExperimentalSection03 } from "../components/landing/experiments/ExperimentalSection03";
import { ExperimentalSection04 } from "../components/landing/experiments/ExperimentalSection04";
import { ExperimentalSection05 } from "../components/landing/experiments/ExperimentalSection05";
import { ExperimentalStaticSection01 } from "../components/landing/experiments/ExperimentalStaticSection01";
import { ExperimentalStaticSection02 } from "../components/landing/experiments/ExperimentalStaticSection02";
import { ExperimentalStaticSection03 } from "../components/landing/experiments/ExperimentalStaticSection03";
import { ExperimentalStaticSection04 } from "../components/landing/experiments/ExperimentalStaticSection04";
import { ExperimentalStaticSection05 } from "../components/landing/experiments/ExperimentalStaticSection05";
import { WorkbenchSection } from "../components/landing/experiments/WorkbenchSection";
import { SignalSection } from "../components/landing/experiments/SignalSection";
import { ControlRoomSection } from "../components/landing/experiments/ControlRoomSection";
import { HandoffSection } from "../components/landing/experiments/HandoffSection";
import { OmniAgentStorySection } from "../components/landing/experiments/OmniAgentStorySection";
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

    {/* 03 — SECTION 2: "FROM AN IDEA TO SOMETHING THAT WORKS." (Continuous Transformation Journey) */}
    <IdeaToExecutionSection />

    {/* 04 — SECTION 3: "ONE INTELLIGENCE. MANY POSSIBILITIES." (Living Domain Workflow Versatility) */}
    <DomainAdaptSection />

    {/* 05 — SECTION 4: "LESS ORCHESTRATION. MORE EXECUTION." (Outcome Typography & Value) */}
    <OutcomeSection />

    {/* ========================================================================= */}
    {/* EXPERIMENTAL CANDIDATE SECTIONS: ANIMATED BATCH (01 - 05)                */}
    {/* ========================================================================= */}
    <div className="relative py-12 text-center border-t border-b border-primary/20 bg-primary/5">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-background/80 text-primary text-xs font-mono font-bold tracking-widest uppercase shadow-sm">
        <span>🧪 Experimental Candidate Concepts: Animated Batch (01 - 05)</span>
      </div>
    </div>

    {/* EXPERIMENT 01 — THE WORK DISAPPEARS (Chaos -> Calm Convergence) */}
    <ExperimentalSection01 />

    {/* EXPERIMENT 02 — ONE REQUEST, MANY ACTIONS (Branching River Stream) */}
    <ExperimentalSection02 />

    {/* EXPERIMENT 03 — THE CONNECTED WORKSPACE (Spatial Translucent Environment) */}
    <ExperimentalSection03 />

    {/* EXPERIMENT 04 — MENTAL CLUTTER TO CLARITY (Editorial Gravitational Dissolution) */}
    <ExperimentalSection04 />

    {/* EXPERIMENT 05 — ONE CORE, MANY WORLDS (Spatial Morphing Realm) */}
    <ExperimentalSection05 />

    {/* ========================================================================= */}
    {/* EXPERIMENTAL CANDIDATE SECTIONS: STATIC / LOW-MOTION BATCH (06 - 10)     */}
    {/* ========================================================================= */}
    <div className="relative py-12 text-center border-t border-b border-border/80 bg-muted/30">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/80 bg-background text-foreground text-xs font-mono font-bold tracking-widest uppercase shadow-sm">
        <span>✨ Experimental Candidate Concepts: Static &amp; Editorial Batch (06 - 10)</span>
      </div>
    </div>

    {/* EXPERIMENT 06 — THE SIMPLE PROMISE (Asymmetric Editorial Typography) */}
    <ExperimentalStaticSection01 />

    {/* EXPERIMENT 07 — REQUEST CATALOGUE (Vertical Use-Case Index) */}
    <ExperimentalStaticSection02 />

    {/* EXPERIMENT 08 — BEFORE & AFTER (Two-Column Contrast Canvas) */}
    <ExperimentalStaticSection03 />

    {/* EXPERIMENT 09 — OUTCOME SHOWCASE (Spacious Outcome Areas) */}
    <ExperimentalStaticSection04 />

    {/* EXPERIMENT 10 — THE OMNIAGENT MANIFESTO (Numbered Philosophy Layout) */}
    <ExperimentalStaticSection05 />

    {/* ========================================================================= */}
    {/* BATCH 03: 5 BRAND-NEW UNIQUE EXPERIMENTAL PAGES                          */}
    {/* ========================================================================= */}
    <div className="relative py-14 text-center border-t border-b border-sky-500/30 bg-sky-500/5">
      <div className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-widest mb-1">03</div>
      <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-1">
        5 UNIQUE EXPERIMENTAL PAGES
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground">
        Five completely new visual directions.
      </p>
    </div>

    {/* NEW PAGE 01 — THE WORKBENCH (Top-Down Spatial Digital Workbench) */}
    <WorkbenchSection />

    {/* NEW PAGE 02 — THE SIGNAL (Full-Width Typographic Noise to Signal Field) */}
    <SignalSection />

    {/* NEW PAGE 03 — THE CONTROL ROOM (Calm Minimal Spatial Status Oversight) */}
    <ControlRoomSection />

    {/* NEW PAGE 04 — THE HANDOFF (Physical Task Delegation Across Viewport) */}
    <HandoffSection />

    {/* NEW PAGE 05 — THE OMNIAGENT STORY (Asymmetric Magazine-Style Manifesto) */}
    <OmniAgentStorySection />

    {/* 06 — FINAL CTA: "WHAT WILL YOU BUILD?" */}
    <CtaSection />

    {/* 07 — FOOTER */}
    <Footer />
  </div>
);

export default Index;
