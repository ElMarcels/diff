import Image from "next/image";

export function UserAvatar({
  src,
  alt,
  size = 40,
  ring = false,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  ring?: boolean;
}) {
  const initials = alt.slice(0, 2).toUpperCase();
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xs font-semibold text-white ${
        ring ? "ring-2 ring-neon-magenta ring-offset-2 ring-offset-black" : ""
      }`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // `unoptimized` keeps arbitrary avatar hosts working without having to
        // allow-list every CDN in next.config.js.
        <Image src={src} alt={alt} fill sizes={`${size}px`} unoptimized className="object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
