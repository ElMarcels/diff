"use client";

import { Button } from "@/components/Button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="font-display text-lg text-neon-magenta">CONNECTION LOST</span>
      <p className="max-w-sm text-white/60">Something interrupted the signal. Try again in a moment.</p>
      <Button variant="primary" onClick={() => reset()}>
        Retry
      </Button>
    </div>
  );
}
