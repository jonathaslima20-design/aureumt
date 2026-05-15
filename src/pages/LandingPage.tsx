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
  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      {/* Noise overlay */}
      <div className="noise">
        <svg width="100%" height="100%">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

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
