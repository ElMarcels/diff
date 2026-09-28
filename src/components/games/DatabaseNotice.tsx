/**
 * Shown when DATABASE_URL is set but the database can't be read (usually the
 * migrations haven't been run). The page still works, it just lists the
 * built-in games and says why community games are missing.
 */
export function DatabaseNotice({ message }: { message: string }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-lg border border-neon-purple/40 bg-surface-raised px-4 py-3">
      <span className="mt-0.5 shrink-0 text-neon-purple" aria-hidden>
        ⚠
      </span>
      <div className="text-sm">
        <p className="font-medium text-white">Showing built-in games only</p>
        <p className="mt-1 text-white/60">{message}</p>
        <code className="mt-2 inline-block rounded bg-black/40 px-2 py-1 text-xs text-neon-cyan">
          npm run db:migrate
        </code>
      </div>
    </div>
  );
}
