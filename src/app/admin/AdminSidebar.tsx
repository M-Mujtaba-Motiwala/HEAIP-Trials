// =============================================================================
// Admin Sidebar — Client component with dynamic dRBAC navigation
// =============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Key,
  BarChart3,
  DollarSign,
  Shield,
  ScrollText,
  ArrowLeft,
  Settings,
  Menu,
  Cpu,
  BookOpen,
  GitBranch,
} from "lucide-react";
import styles from "./admin.module.css";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Building2,
  Key,
  BarChart3,
  DollarSign,
  Shield,
  ScrollText,
  Settings,
  Cpu,
  BookOpen,
  GitBranch,
};

const DEFAULT_ITEMS = [
  { route: "/admin", moduleName: "Overview", icon: "LayoutDashboard" },
  { route: "/admin/users", moduleName: "Employees", icon: "Users" },
  { route: "/admin/departments", moduleName: "Departments", icon: "Building2" },
  { route: "/admin/roles", moduleName: "Roles & Permissions", icon: "Key" },
  { route: "/admin/analytics", moduleName: "Analytics", icon: "BarChart3" },
  { route: "/admin/costs", moduleName: "Cost Control", icon: "DollarSign" },
  { route: "/admin/policies", moduleName: "AI Policies", icon: "Shield" },
  { route: "/admin/models", moduleName: "AI Models", icon: "Cpu" },
  { route: "/admin/knowledge", moduleName: "Knowledge Base", icon: "BookOpen" },
  { route: "/admin/workflows", moduleName: "Workflows", icon: "GitBranch" },
  { route: "/admin/audit", moduleName: "Audit Logs", icon: "ScrollText" },
];

interface AdminSidebarProps {
  user: {
    name?: string | null;
    role: string;
  };
  modules?: Array<{ route: string; moduleName: string; icon: string }>;
}

export default function AdminSidebar({ user, modules }: AdminSidebarProps) {
  const pathname = usePathname();

  // ── Collapse state ────────────────────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Auto-collapse on mobile; persist desktop preference
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        const saved = localStorage.getItem("adminSidebarCollapsed");
        setIsCollapsed(saved === "true");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (window.innerWidth >= 768) {
        localStorage.setItem("adminSidebarCollapsed", String(next));
      }
      return next;
    });
  };

  const navItems = modules && modules.length > 0 ? modules : DEFAULT_ITEMS;

  function isActive(route: string) {
    if (route === "/admin") return pathname === "/admin";
    return pathname === route || pathname.startsWith(route + "/");
  }

  return (
    <aside className={`${styles.adminSidebar} ${isCollapsed ? styles.collapsed : ""}`}>
      {/* Hamburger toggle */}
      <button
        type="button"
        className={styles.hamburgerButton}
        onClick={toggleSidebar}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!isCollapsed}
      >
        <Menu size={20} />
      </button>

      {/* Header */}
      <div className={styles.adminSidebarHeader}>
        <h1 className={styles.adminTitle}>
          <Settings size={18} />
          {!isCollapsed && <span>Admin Panel</span>}
        </h1>
        {!isCollapsed && (
          <p className={styles.adminSubtitle}>
            {user.role === "SUPER_ADMIN"
              ? "Super Administrator"
              : user.role === "ADMIN"
              ? "Administrator"
              : "Manager"}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.adminNav}>
        {navItems.map((item) => {
          const IconComp = ICON_MAP[item.icon] || LayoutDashboard;
          return (
            <Link
              key={item.route}
              href={item.route}
              className={`${styles.adminNavItem} ${
                isActive(item.route) ? styles.active : ""
              }`}
              title={isCollapsed ? item.moduleName : undefined}
            >
              <IconComp size={18} />
              {!isCollapsed && <span>{item.moduleName}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Back to Chat */}
      <Link href="/chat" className={styles.backToChat} title={isCollapsed ? "Back to Chat" : undefined}>
        <ArrowLeft size={16} />
        {!isCollapsed && <span>Back to Chat</span>}
      </Link>
    </aside>
  );
}
