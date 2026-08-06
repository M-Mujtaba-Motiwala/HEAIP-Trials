// =============================================================================
// NextAuth v5 Configuration — Hamdard AI Platform
// =============================================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getUserPermissionProfile } from "@/lib/permissions";
import { authConfig } from "./auth.config";
import { enforceLogin } from "@/lib/policy-enforcer";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // ── Providers ───────────────────────────────────────────────────────────
  providers: [
    Credentials({
      name: "Hamdard Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        const identifier = credentials.email as string;
        const employee = await db.employee.findFirst({
          where: {
            OR: [
              { email: identifier },
              { employeeId: identifier },
            ],
          },
        });

        if (!employee) {
          throw new Error("Invalid email or password");
        }

        if (!employee.isActive) {
          throw new Error("Your account has been deactivated. Contact IT.");
        }

        // Admin Approval Workflow Check
        if (employee.registrationStatus === "PENDING") {
          throw new Error("Your registration is pending admin approval.");
        }

        if (employee.registrationStatus === "REJECTED") {
          throw new Error("Your registration request was rejected by admin.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          employee.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // ── Policy Enforcement: Login ──────────────────────────────────────
        const loginCheck = await enforceLogin(employee.id);
        if (!loginCheck.allowed) {
          throw new Error(loginCheck.decision.blockReason || "Login denied by policy");
        }

        // Fetch dRBAC permission profile
        const permProfile = await getUserPermissionProfile(employee.id);

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          employeeId: employee.employeeId,
          role: employee.role,
          department: employee.department,
          designation: employee.designation,
          registrationStatus: employee.registrationStatus,
          image: employee.avatarUrl,
          permissions: Array.from(permProfile.permissions),
          roles: permProfile.roles.map((r) => r.code),
        };
      },
    }),
  ],
});
