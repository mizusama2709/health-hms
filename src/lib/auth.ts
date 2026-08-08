import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isLoginRateLimited, recordFailedLoginAttempt, clearLoginAttempts } from "@/lib/loginRateLimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // JWT strategy ties session validity to maxAge from the last refresh, and
  // updateAge controls how often an active user's token gets re-issued — so
  // maxAge here is effectively the idle-logout window (30 min, typical for
  // a PHI-handling app), while updateAge (5 min) keeps a continuously-active
  // session rolling forward without re-prompting for credentials every 30
  // minutes of real use.
  session: { strategy: "jwt", maxAge: 30 * 60, updateAge: 5 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Checked before touching the DB/bcrypt — same generic null result
        // as bad credentials, so a locked-out attempt can't be
        // distinguished from a wrong password (no account-existence or
        // lockout-state oracle).
        if (await isLoginRateLimited(email)) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
          await recordFailedLoginAttempt(email);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await recordFailedLoginAttempt(email);
          return null;
        }

        await clearLoginAttempts(email);
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub as string;
      session.user.role = token.role as string;
      session.user.tenantId = token.tenantId as string | null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
