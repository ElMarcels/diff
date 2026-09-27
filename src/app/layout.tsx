import type { Metadata } from "next";
import { Space_Grotesk, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://diff.gg";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DIFF — Play. Compete. Differ.",
  description:
    "DIFF is a retro-inspired online arcade platform where you can play, compete and climb the leaderboard.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "DIFF — Play. Compete. Differ.",
    description:
      "DIFF is a retro-inspired online arcade platform where you can play, compete and climb the leaderboard.",
    url: siteUrl,
    siteName: "DIFF",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DIFF — Play. Compete. Differ.",
    description:
      "DIFF is a retro-inspired online arcade platform where you can play, compete and climb the leaderboard.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${pressStart.variable}`}>
      <body className="font-sans antialiased flex min-h-dvh flex-col bg-black">
        <SessionProvider>
          <LocaleProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </ToastProvider>
          </LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
