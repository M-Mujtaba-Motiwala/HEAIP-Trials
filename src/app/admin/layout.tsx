import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin Panel | Hamdard AI Platform",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "DEPT_MANAGER"];
  if (!allowedRoles.includes(session.user.role || "")) {
    redirect("/chat?error=unauthorized");
  }

  return <>{children}</>;
}
