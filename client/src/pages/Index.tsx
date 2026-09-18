import React from "react";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import WhatIsSection from "../components/landing/WhatIsSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import UseCasesSection from "../components/landing/UseCasesSection";
import WhyOmniAgentSection from "../components/landing/WhyOmniAgentSection";
import TrustSection from "../components/landing/TrustSection";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";

const Index = () => (
  <div className="min-h-screen bg-white text-slate-900 selection:bg-sky-500/20 selection:text-slate-900">
    <Navbar />
    <HeroSection />
    <WhatIsSection />
    <HowItWorksSection />
    <FeaturesSection />
    <UseCasesSection />
    <WhyOmniAgentSection />
    <TrustSection />
    <CtaSection />
    <Footer />
  </div>
);

export default Index;
