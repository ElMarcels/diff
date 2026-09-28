"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShieldCheck, Upload, Wrench } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "@/lib/auth/client";

export function Navbar() {
  const { user, status, signOut, isModerator, isOwner } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/games", label: t.nav.games },
    { href: "/leaderboards", label: t.nav.leaderboards },
    { href: "/creator", label: t.nav.creator },
    ...(isModerator ? [{ href: "/moderation", label: t.nav.moderation }] : []),
    ...(isOwner ? [{ href: "/owner", label: t.nav.owner }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-black/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="focus-ring">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-white/80 transition-colors hover:text-neon-cyan focus-ring"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <UserMenu
              username={user.username}
              avatar={user.avatar}
              isModerator={isModerator}
              isOwner={isOwner}
              onSignOut={() => signOut()}
            />
          ) : (
            <Button href="/login" variant="primary">
              {status === "loading" ? t.common.loading : t.nav.login}
            </Button>
          )}
        </div>

        <button
          className="p-2 text-white md:hidden focus-ring"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-surface-border bg-black px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="py-1 text-white/90" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href={`/profile/${user.username}`} className="py-1 text-white/90">
                  {t.nav.profile}
                </Link>
                <Link href="/settings" className="py-1 text-white/90">
                  {t.nav.settings}
                </Link>
                <button className="py-1 text-left text-white/60" onClick={() => signOut()}>
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <Button href="/login" variant="primary" className="mt-2 w-full">
                {t.nav.login}
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function UserMenu({
  username,
  avatar,
  isModerator,
  isOwner,
  onSignOut,
}: {
  username: string;
  avatar?: string | null;
  isModerator: boolean;
  isOwner: boolean;
  onSignOut: () => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button className="flex items-center gap-2 rounded-full focus-ring" onClick={() => setOpen((v) => !v)}>
        <UserAvatar src={avatar} alt={username} size={32} />
        <span className="text-sm text-white/90">{username}</span>
        {isOwner ? (
          <ShieldCheck size={14} className="text-neon-purple" />
        ) : isModerator ? (
          <Wrench size={14} className="text-neon-cyan" />
        ) : null}
      </button>
      {open && (
        <div className="clip-notch-sm absolute right-0 top-11 w-52 border border-surface-border bg-surface-raised p-2 shadow-glow-soft">
          <Link
            href={`/profile/${username}`}
            className="block rounded px-3 py-2 text-sm text-white/90 hover:bg-surface-border"
            onClick={() => setOpen(false)}
          >
            {t.nav.profile}
          </Link>
          <Link
            href="/creator"
            className="flex items-center gap-2 rounded px-3 py-2 text-sm text-white/90 hover:bg-surface-border"
            onClick={() => setOpen(false)}
          >
            <Upload size={13} /> {t.nav.creator}
          </Link>
          {isModerator && (
            <Link
              href="/moderation"
              className="flex items-center gap-2 rounded px-3 py-2 text-sm text-white/90 hover:bg-surface-border"
              onClick={() => setOpen(false)}
            >
              <Wrench size={13} /> {t.nav.moderation}
            </Link>
          )}
          {isOwner && (
            <Link
              href="/owner"
              className="flex items-center gap-2 rounded px-3 py-2 text-sm text-neon-purple hover:bg-surface-border"
              onClick={() => setOpen(false)}
            >
              <ShieldCheck size={13} /> {t.nav.owner}
            </Link>
          )}
          <Link
            href="/settings"
            className="block rounded px-3 py-2 text-sm text-white/90 hover:bg-surface-border"
            onClick={() => setOpen(false)}
          >
            {t.nav.settings}
          </Link>
          <button
            className="block w-full rounded px-3 py-2 text-left text-sm text-white/60 hover:bg-surface-border"
            onClick={onSignOut}
          >
            {t.nav.logout}
          </button>
        </div>
      )}
    </div>
  );
}
