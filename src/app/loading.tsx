export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 animate-pulse-glow">
        <rect x="2" y="2" width="8" height="8" fill="#FF2E9A" />
        <rect x="14" y="2" width="8" height="8" fill="#00F0FF" />
        <rect x="8" y="8" width="8" height="8" fill="#9D4EDD" />
        <rect x="2" y="14" width="8" height="8" fill="#3D5AFE" />
        <rect x="14" y="14" width="8" height="8" fill="#FF2E9A" />
      </svg>
      <span className="font-display text-sm tracking-widest text-white/80">DIFF</span>
    </div>
  );
}
