import { useEffect } from 'react';
import { Navbar } from './landing/Navbar';
import { Hero } from './landing/Hero';
import { Marquee } from './landing/Marquee';
import { Solution } from './landing/Solution';
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
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute('content') || '';
    meta?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    return () => {
      meta?.setAttribute('content', original);
    };
  }, []);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <div className="relative z-10">
        <Navbar onLogin={onLogin} />
        <Hero onStart={onLogin} />
        <Marquee />
        <Solution />
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
