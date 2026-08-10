// =============================================================================
// Session Provider — Hamdard AI Platform
// Client-side wrapper that provides NextAuth session context to all components
// =============================================================================

"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";

function SessionHeartbeat() {
  const { data: session } = useSession();
  
  useEffect(() => {
    if (!session) return;
    
    // Generate a unique session token for this browser tab
    let token = sessionStorage.getItem("hamdard_session_token");
    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem("hamdard_session_token", token);
    }
    
    const ping = async () => {
      try {
        await fetch("/api/auth/session-ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: token })
        });
      } catch (e) {
        // Silent fail
      }
    };
    
    ping(); // initial ping
    const int = setInterval(ping, 3 * 60 * 1000); // ping every 3 minutes
    return () => clearInterval(int);
  }, [session]);
  
  return null;
}

interface Props {
  children: ReactNode;
}

export default function SessionProvider({ children }: Props) {
  return (
    <NextAuthSessionProvider>
      {children}
      <SessionHeartbeat />
    </NextAuthSessionProvider>
  );
}
