const HEIGHTS: Record<string, string> = {
  sm: 'h-8',
  md: 'h-15',
  lg: 'h-16',
};

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <a href="#" className="inline-flex items-center">
      <img
        src="/auratalk_logo_sem_fundo.png"
        alt="AuraTalk"
        className={`${HEIGHTS[size]} w-auto object-contain`}
      />
    </a>
  );
}
