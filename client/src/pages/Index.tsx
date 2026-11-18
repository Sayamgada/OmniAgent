import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import { WhatIsOmniAgentSection } from "../components/landing/WhatIsOmniAgentSection";
import { WorkDisappearsSection } from "../components/landing/WorkDisappearsSection";
import { BeforeVsAfterSection } from "../components/landing/BeforeVsAfterSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";
import { useSiteTheme } from "../context/ThemeContext";

const Index = () => {
  const { landingTheme } = useSiteTheme();

  return (
    <div className={`relative min-h-screen w-full ${landingTheme} bg-background text-foreground selection:bg-primary/25 selection:text-foreground`}>
      <Navbar />
      <HeroSection />
      {/* Landing sections strictly establish the user's selected landingTheme */}
      <div className={`${landingTheme} bg-background text-foreground transition-colors duration-300`}>
        <WhatIsOmniAgentSection />
        <WorkDisappearsSection />
        <BeforeVsAfterSection />
        <HowItWorksSection />
        <CtaSection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
