export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`clip-notch-sm animate-pulse-glow bg-surface-raised ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="clip-notch space-y-2 border border-surface-border bg-surface p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
