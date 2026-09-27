import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Auth.js (NextAuth) config using Discord OAuth (brief section 9).
 * Only the minimum Discord fields are persisted: id, username, display
 * name, avatar. No emails, guild lists, or other scopes are requested
 * beyond "identify", which is all DIFF needs.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "identify" } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, profile }) {
      if (!isDbConfigured()) return true; // allow local dev without a DB
      const db = getDb()!;
      const discordProfile = profile as any;
      const discordId = discordProfile.id as string;
      const avatar = discordProfile.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${discordProfile.avatar}.png`
        : null;

      const existing = await db.select().from(users).where(eq(users.discordId, discordId));

      if (existing.length === 0) {
        // First login: create the DIFF account. Username defaults to the
        // Discord global_name/username and can be changed later in Settings.
        const baseUsername = (discordProfile.global_name || discordProfile.username || `player${discordId.slice(-5)}`)
          .toString()
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 32) || `player${discordId.slice(-5)}`;

        await db.insert(users).values({
          discordId,
          username: baseUsername,
          displayName: discordProfile.global_name || discordProfile.username || baseUsername,
          avatar,
          lastLogin: new Date(),
        });
      } else {
        await db
          .update(users)
          .set({ lastLogin: new Date(), avatar })
          .where(eq(users.discordId, discordId));
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.discordId = (profile as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).discordId = token.discordId;
        if (isDbConfigured() && token.discordId) {
          const db = getDb()!;
          const [dbUser] = await db.select().from(users).where(eq(users.discordId, token.discordId as string));
          if (dbUser) {
            (session.user as any).id = dbUser.id;
            (session.user as any).username = dbUser.username;
            session.user.image = dbUser.avatar;
            session.user.name = dbUser.displayName;
          }
        }
      }
      return session;
    },
  },
};
