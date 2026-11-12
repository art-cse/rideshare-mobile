import "server-only";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { localLogin } from "./local-login";
import { validIdentity } from "./identity";

export const authOptions: NextAuthOptions = {
  providers: [GitHubProvider({
    clientId: process.env.GITHUB_ID ?? "",
    clientSecret: process.env.GITHUB_SECRET ?? "",
  }), CredentialsProvider({
    name: "Përdorues dhe fjalëkalim",
    credentials: { username: { label: "Përdoruesi", type: "text" }, password: { label: "Fjalëkalimi", type: "password" } },
    authorize: async credentials => localLogin(credentials?.username, credentials?.password),
  })],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 2 * 60 * 60 },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub && validIdentity(token.sub)) session.user.id = token.sub;
      return session;
    },
  },
};
