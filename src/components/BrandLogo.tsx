export function BrandLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-14 w-14 rounded-2xl' : size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl';
  const svgDims = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-5 w-5' : 'h-5 w-5';

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm ${dims}`}
      aria-hidden="true"
    >
      <svg className={svgDims} viewBox="0 0 64 64" fill="none">
        <path d="M46 21A18 18 0 0 0 15 26" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" />
        <path d="M18 43A18 18 0 0 0 49 38" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" />
        <path d="M21 34C25 27.5 29.5 27.5 32 32C34.5 36.5 39 36.5 43 30" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" />
        <circle cx="46.5" cy="21.5" r="3.2" fill="currentColor" />
      </svg>
    </div>
  );
}
