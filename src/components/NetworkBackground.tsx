import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

export default function NetworkBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: false,
      background: {
        color: { value: "transparent" },
      },
      fpsLimit: 60,
      particles: {
        number: {
          value: 80,
          density: {
            enable: true,
            width: 1920,
            height: 1080,
          },
        },
        color: {
          value: "#ffffff",
        },
        shape: {
          type: "circle",
        },
        opacity: {
          value: 0.25,
        },
        size: {
          value: { min: 1, max: 3 },
        },
        links: {
          enable: true,
          distance: 150,
          color: "#ffffff",
          opacity: 0.15,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.8,
          direction: "none",
          random: false,
          straight: false,
          outModes: {
            default: "out",
          },
        },
      },
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: "grab",
          },
        },
        modes: {
          grab: {
            distance: 180,
            links: {
              opacity: 0.3,
              color: "#ffffff",
            },
          },
        },
      },
      detectRetina: true,
    }),
    []
  );

  if (!init) return null;

  return (
    <div className="fixed inset-0 -z-10 w-full h-full pointer-events-none">
      <Particles
        id="network-particles"
        options={options}
        className="w-full h-full pointer-events-auto"
      />
    </div>
  );
}
