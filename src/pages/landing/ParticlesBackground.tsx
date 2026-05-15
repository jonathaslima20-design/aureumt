import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

export function ParticlesBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: { value: 'transparent' } },
      fpsLimit: 60,
      particles: {
        color: { value: '#ffffff' },
        links: {
          color: '#ffffff',
          distance: 150,
          enable: true,
          opacity: 0.03,
          width: 0.5,
        },
        move: {
          enable: true,
          speed: 0.3,
          direction: 'none' as const,
          outModes: { default: 'out' as const },
        },
        number: {
          density: { enable: true },
          value: 60,
        },
        opacity: { value: 0.08 },
        shape: { type: 'circle' },
        size: { value: { min: 0.5, max: 1.5 } },
      },
      detectRetina: true,
    }),
    []
  );

  if (!init) return null;

  return (
    <Particles
      className="fixed inset-0 pointer-events-none z-0"
      options={options}
    />
  );
}
