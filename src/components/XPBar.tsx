export function XPBar({ level, percent }: { level: number; percent: number }) {
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-display text-[10px] text-neon-cyan">LEVEL {level}</span>
        <span className="text-[10px] text-muted">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-purple via-neon-magenta to-neon-cyan shadow-glow-magenta transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
