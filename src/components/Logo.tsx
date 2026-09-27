export function Logo({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="8" height="8" fill="#FF2E9A" />
        <rect x="14" y="2" width="8" height="8" fill="#00F0FF" />
        <rect x="8" y="8" width="8" height="8" fill="#9D4EDD" />
        <rect x="2" y="14" width="8" height="8" fill="#3D5AFE" />
        <rect x="14" y="14" width="8" height="8" fill="#FF2E9A" />
      </svg>
      <span className="font-display text-[13px] tracking-widest text-white">DIFF</span>
    </span>
  );
}
