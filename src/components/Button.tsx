import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface BaseProps {
  variant?: Variant;
  href?: string;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-neon-magenta text-black font-semibold hover:shadow-glow-magenta hover:-translate-y-0.5",
  secondary:
    "bg-transparent border border-neon-cyan text-neon-cyan hover:shadow-glow-cyan hover:-translate-y-0.5",
  ghost: "bg-surface-raised text-white/90 hover:bg-surface-border",
};

const base =
  "clip-notch-sm inline-flex items-center justify-center gap-2 px-6 py-3 text-sm tracking-wide transition-all duration-200 focus-ring";

export function Button({
  variant = "primary",
  href,
  className = "",
  children,
  ...rest
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  const classes = `${base} ${variantClasses[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
