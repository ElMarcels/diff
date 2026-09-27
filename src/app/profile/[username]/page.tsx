"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PlayerCard } from "@/components/PlayerCard";
import { AchievementBadge } from "@/components/AchievementBadge";
import { mockStats, mockUser, MOCK_ACHIEVEMENTS } from "@/lib/mock-data";

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { t } = useLocale();
  // TODO: once DATABASE_URL is set, replace with a real lookup by username
  // (see lib/db/schema.ts `users.username`) instead of this mock user.
  const user = mockUser(params.username);
  const stats = mockStats();
  const unlocked = MOCK_ACHIEVEMENTS.slice(0, 4);
  const locked = MOCK_ACHIEVEMENTS.slice(4);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <PlayerCard user={user} stats={stats} t={t} />

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-white">{t.profile.achievements}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {unlocked.map((a) => (
            <AchievementBadge key={a.slug} achievement={a} unlocked />
          ))}
          {locked.map((a) => (
            <AchievementBadge key={a.slug} achievement={a} unlocked={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
