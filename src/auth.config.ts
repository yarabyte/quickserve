import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Coolify / reverse-proxy : Auth.js doit faire confiance au Host / X-Forwarded-*
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isDashboard = path.startsWith("/dashboard");
      const isLogin = path.startsWith("/login");
      const isSetup = path.startsWith("/onboarding/setup");

      if (isDashboard || isSetup) {
        return isLoggedIn;
      }
      if (isLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
