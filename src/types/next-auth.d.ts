/**
 * next-auth.d.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module augmentation for NextAuth v5 (Auth.js).
 *
 * Extends the default Session and JWT types with Hamdard-specific fields
 * and dRBAC permissions array for type-safe authorization.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Primary database ID */
      id: string;
      /** Human-readable employee identifier (e.g. "HAM-001") */
      employeeId: string;
      /** Role-based access control primary role string */
      role: string;
      /** Organisational department */
      department: string;
      /** Job title / designation */
      designation: string;
      /** Account registration approval status (APPROVED | PENDING | REJECTED) */
      registrationStatus: string;
      /** Array of granted permission keys (e.g. ["admin.dashboard.view", "users.employee.read"]) */
      permissions: string[];
      /** Array of assigned role codes */
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    employeeId: string;
    role: string;
    department: string;
    designation: string;
    registrationStatus: string;
    permissions?: string[];
    roles?: string[];
  }
}

import { JWT } from "@auth/core/jwt";

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    employeeId: string;
    role: string;
    department: string;
    designation: string;
    registrationStatus: string;
    permissions: string[];
    roles: string[];
  }
}

