import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      onboardingCompletedAt: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    onboardingCompletedAt?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    onboardingCompletedAt?: Date | null;
  }
}
