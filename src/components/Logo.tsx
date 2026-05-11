import { Circle } from 'lucide-react';

export function Logo({ size = 24 }: { size?: number }) {
  const fontSize = Math.round(size * 0.625);
  const gap = size > 32 ? 'gap-3' : 'gap-1.5';

  return (
    <div className={`flex items-center ${gap}`}>
      <Circle
        size={size}
        strokeWidth={1.5}
        className="text-white"
        style={{ filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.35))' }}
      />
      <div className="tracking-tight" style={{ fontSize: `${fontSize}px` }}>
        <span className="font-semibold text-white">Aura</span>
        <span className="font-normal text-neutral-300">Talk</span>
      </div>
    </div>
  );
}
