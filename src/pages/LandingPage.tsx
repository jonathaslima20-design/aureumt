import { ParticlesBackground } from './landing/ParticlesBackground';
import { Header } from './landing/Header';
import { Hero } from './landing/Hero';
import { Agents } from './landing/Agents';
import { Features } from './landing/Features';
import { HowItWorks } from './landing/HowItWorks';
import { Pricing } from './landing/Pricing';
import { FAQ } from './landing/FAQ';
import { CTA } from './landing/CTA';
import { Footer } from './landing/Footer';

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="relative min-h-screen bg-background text-white overflow-x-hidden">
      <ParticlesBackground />
      <div className="relative z-10">
        <Header onLogin={onLogin} />
        <Hero onStart={onLogin} />
        <Agents />
        <Features />
        <HowItWorks />
        <Pricing onStart={onLogin} />
        <FAQ />
        <CTA onStart={onLogin} />
        <Footer />
      </div>
    </div>
  );
}
