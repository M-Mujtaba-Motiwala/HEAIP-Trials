// =============================================================================
// NextAuth Route Handler — Hamdard AI Platform
// Handles all /api/auth/* requests (login, logout, session, etc.)
// =============================================================================

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
