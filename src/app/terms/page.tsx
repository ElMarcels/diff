export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-white/80">
      <h1 className="mb-6 text-2xl font-semibold text-white">Terms of Service</h1>
      <div className="space-y-4 text-sm leading-relaxed">
        <p>By creating a DIFF account, you agree to play fair: scores and results are validated on our
          servers, and attempts to manipulate them may result in a reset of your statistics or account
          suspension.</p>
        <p>
          DIFF is provided as-is, for entertainment purposes. Features described as upcoming
          (multiplayer, tournaments, seasons, cosmetics) are not guaranteed delivery dates.
        </p>
        <p>
          You must comply with Discord&apos;s own Terms of Service when using Discord to sign in to DIFF.
        </p>
        <p className="text-xs text-muted">
          This is a template policy for the DIFF v1.0 scaffold — review it with counsel before shipping
          to production.
        </p>
      </div>
    </div>
  );
}
