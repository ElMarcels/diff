import * as Icons from "lucide-react";
import { Achievement } from "@/types";

export function AchievementBadge({ achievement, unlocked = true }: { achievement: Achievement; unlocked?: boolean }) {
  const Icon = (Icons as any)[achievement.icon] ?? Icons.Award;
  return (
    <div
      className={`clip-notch-sm flex flex-col items-center gap-2 border p-4 text-center transition-all ${
        unlocked
          ? "border-neon-purple/60 bg-surface-raised shadow-glow-purple animate-rise-in"
          : "border-surface-border bg-surface opacity-40 grayscale"
      }`}
      title={achievement.description}
    >
      <Icon size={22} className={unlocked ? "text-neon-cyan" : "text-muted"} />
      <span className="text-xs font-medium text-white/90">{achievement.name}</span>
    </div>
  );
}
