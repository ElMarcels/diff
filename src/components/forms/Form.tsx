"use client";

import { AlertCircle } from "lucide-react";

/** Small form primitives shared by auth, creator, moderation and owner screens. */

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  hint,
  required,
  min,
  max,
  step,
  name,
  autoComplete,
  disabled,
  className = "",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          disabled={disabled}
          className="clip-notch-sm w-full border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan disabled:cursor-not-allowed disabled:opacity-60"
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          autoComplete={autoComplete}
          disabled={disabled}
          className="clip-notch-sm w-full border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan disabled:cursor-not-allowed disabled:opacity-60"
        />
      )}
      {hint && !error && <span className="mt-1 block text-[11px] text-muted/80">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-neon-magenta">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  error,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="clip-notch-sm w-full border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface-raised">
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-[11px] text-neon-magenta">{error}</span>}
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-3 flex items-start gap-2 border border-neon-magenta/50 bg-neon-magenta/10 px-3 py-2 text-xs text-white/90">
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-neon-magenta" />
      <span>{message}</span>
    </div>
  );
}
