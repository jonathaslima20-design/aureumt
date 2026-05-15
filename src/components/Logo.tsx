const SIZES: Record<string, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <a href="#" className={`font-display font-bold ${SIZES[size]} tracking-tighter group inline-flex`}>
      <span className="text-white group-hover:text-accent transition-colors">AURA</span>
      <span className="text-accent group-hover:text-white transition-colors">//</span>
      <span className="text-white group-hover:text-accent transition-colors">TALK</span>
    </a>
  );
}
