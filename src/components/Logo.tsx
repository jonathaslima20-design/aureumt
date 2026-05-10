import { Circle } from 'lucide-react';

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Circle size={size} strokeWidth={1.5} className="text-white" />
      <div className="text-[15px] tracking-tight">
        <span className="font-semibold text-white">Aura</span>
        <span className="font-normal text-neutral-300">Talk</span>
      </div>
    </div>
  );
}
