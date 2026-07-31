// =============================================================================
// Session Provider — Hamdard AI Platform
// Client-side wrapper that provides NextAuth session context to all components
// =============================================================================

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function SessionProvider({ children }: Props) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
