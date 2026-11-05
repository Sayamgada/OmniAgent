import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import { WhatIsOmniAgentSection } from "../components/landing/WhatIsOmniAgentSection";
import { WorkDisappearsSection } from "../components/landing/WorkDisappearsSection";
import { BeforeVsAfterSection } from "../components/landing/BeforeVsAfterSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";

const Index = () => (
  <div className="relative min-h-screen w-full bg-background text-foreground selection:bg-primary/25 selection:text-foreground">
    <Navbar />
    <HeroSection />
    <WhatIsOmniAgentSection />
    <WorkDisappearsSection />
    <BeforeVsAfterSection />
    <HowItWorksSection />
    <CtaSection />
    <Footer />
  </div>
);

export default Index;
