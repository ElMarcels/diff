export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-white/80">
      <h1 className="mb-6 text-2xl font-semibold text-white">Privacy Policy</h1>
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          DIFF stores the minimum data needed to run your account: your email address, username,
          display name, optional avatar, registration date, last login, and your in-game statistics
          (scores, matches played, wins, losses, XP and level).
        </p>
        <p>
          Your password is never stored in plain text. We keep a slow, salted hash of it
          (scrypt) and use revocable session tokens stored as hashes; signing out or changing your
          password invalidates every other session immediately.
        </p>
        <p>
          We do not use third-party identity providers, and we never sell or share your data with
          advertisers.
        </p>
        <p>
          Match results are validated on our servers before being saved, so your statistics reflect
          games actually played on DIFF.
        </p>
        <p>
          If you submit a game for review, your username, email, the links you provide and the
          messages you post in the review thread are visible to the platform moderators and, once
          the game is published, to everyone.
        </p>
        <p>
          You can make your profile private at any time from Settings → Privacy. You can request
          account deletion by contacting us through the DIFF Discord server.
        </p>
        <p className="text-xs text-muted">
          This is a template policy for the DIFF v1.0 scaffold — review it with counsel before shipping
          to production.
        </p>
      </div>
    </div>
  );
}
