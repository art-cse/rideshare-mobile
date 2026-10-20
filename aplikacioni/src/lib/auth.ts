import "server-only";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [GitHubProvider({
    clientId: process.env.GITHUB_ID ?? "",
    clientSecret: process.env.GITHUB_SECRET ?? "",
  })],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 2 * 60 * 60 },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub && /^\d+$/.test(token.sub)) session.user.id = token.sub;
      return session;
    },
  },
};
