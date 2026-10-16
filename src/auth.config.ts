import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: no Prisma adapter, no Node-only providers/imports here.
 * Used directly by middleware (edge runtime) and extended by `auth.ts` for the
 * full server configuration. Keep this file free of Node-only dependencies.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/app") || pathname.startsWith("/admin");

      if (isProtected && !isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.onboardingCompletedAt = user.onboardingCompletedAt ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.onboardingCompletedAt =
          (token.onboardingCompletedAt as Date | null) ?? null;
      }
      return session;
    },
  },
};
