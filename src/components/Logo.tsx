const HEIGHTS: Record<string, string> = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
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
