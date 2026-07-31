import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // ── Session Strategy ────────────────────────────────────────────────────
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours (standard work day)
  },

  // ── Pages ───────────────────────────────────────────────────────────────
  pages: {
    signIn: "/login",
  },

  // ── Callbacks ───────────────────────────────────────────────────────────
  callbacks: {
    /**
     * JWT callback — runs on every request.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.employeeId = user.employeeId;
        token.role = user.role;
        token.department = user.department;
        token.designation = user.designation;
        token.registrationStatus = user.registrationStatus || "APPROVED";
        token.permissions = user.permissions || [];
        token.roles = user.roles || [user.role];
      }
      return token;
    },

    /**
     * Session callback — shapes the session object sent to the client.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.employeeId = token.employeeId;
        session.user.role = token.role;
        session.user.department = token.department;
        session.user.designation = token.designation;
        session.user.registrationStatus = token.registrationStatus;
        session.user.permissions = token.permissions || [];
        session.user.roles = token.roles || [token.role];
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

