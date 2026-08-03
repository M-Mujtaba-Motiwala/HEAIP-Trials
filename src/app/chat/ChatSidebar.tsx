// =============================================================================
// Chat Sidebar — Client component for chat navigation
// Features: collapsible, mobile auto-collapse, search, active session state,
//           three-dot overflow menu (Rename, Archive, Delete), optimistic UI,
//           undo toast, Archive nav button + badge, Floating ArchivePanel
// =============================================================================

"use client";

import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Plus,
  MessageSquare,
  LogOut,
  Shield,
  Menu,
  Search,
  X,
  MoreVertical,
  Edit2,
  Archive,
  Trash2,
  RotateCcw,
  Check,
  ArchiveRestore,
} from "lucide-react";
import Link from "next/link";
import styles from "./chat.module.css";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import ArchivePanel, { ArchivedSession } from "./ArchivePanel";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
    department: string;
    avatarUrl?: string | null;
  };
  chatSessions: ChatSession[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ConversationRow — individual chat item with three-dot overflow menu
// ─────────────────────────────────────────────────────────────────────────────

function ConversationRow({
  session,
  isActive,
  isArchivingOut,
  onRename,
  onArchive,
  onDelete,
  openMenuId,
  setOpenMenuId,
  editingSessionId,
  setEditingSessionId,
}: {
  session: ChatSession;
  isActive: boolean;
  isArchivingOut: boolean;
  onRename: (session: ChatSession, newTitle: string) => void;
  onArchive: (session: ChatSession) => void;
  onDelete: (session: ChatSession) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  editingSessionId: string | null;
  setEditingSessionId: (id: string | null) => void;
}) {
  const isEditing = editingSessionId === session.id;
  const isMenuOpen = openMenuId === session.id;
  const [titleInput, setTitleInput] = useState(session.title);

  useEffect(() => {
    setTitleInput(session.title);
  }, [session.title]);

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim()) {
      onRename(session, titleInput.trim());
    }
    setEditingSessionId(null);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSaveRename} className={styles.renameForm}>
        <input
          type="text"
          className={styles.renameInput}
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditingSessionId(null);
          }}
        />
        <button type="submit" className={styles.renameConfirm} aria-label="Confirm rename">
          <Check size={14} />
        </button>
        <button
          type="button"
          className={styles.renameCancel}
          onClick={() => setEditingSessionId(null)}
          aria-label="Cancel rename"
        >
          <X size={14} />
        </button>
      </form>
    );
  }

  return (
    <div className={`${styles.chatItemWrapper} ${isArchivingOut ? styles.archivingOut : ""}`}>
      <Link
        href={`/chat/${session.id}`}
        className={`${styles.chatItem} ${isActive ? styles.active : ""}`}
      >
        <MessageSquare size={16} />
        <span className={styles.chatItemText}>{session.title}</span>
      </Link>

      <button
        type="button"
        className={`${styles.menuButton} ${isMenuOpen ? styles.active : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuId(isMenuOpen ? null : session.id);
        }}
        aria-label="Conversation options"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
      >
        <MoreVertical size={14} />
      </button>

      {isMenuOpen && (
        <div className={styles.dropdownMenu} role="menu">
          <button
            type="button"
            className={styles.dropdownItem}
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(null);
              setEditingSessionId(session.id);
            }}
          >
            <Edit2 size={13} />
            <span>Rename</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(null);
              onArchive(session);
            }}
          >
            <Archive size={13} />
            <span>Archive</span>
          </button>
          <button
            type="button"
            className={`${styles.dropdownItem} ${styles.danger}`}
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(null);
              onDelete(session);
            }}
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatSidebar — Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatSidebar({ user, chatSessions }: ChatSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  // ── Collapse state ────────────────────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [sessions, setSessions] = useState(chatSessions);

  // ── Archive Panel state ───────────────────────────────────────────────────
  const [isArchivePanelOpen, setIsArchivePanelOpen] = useState(false);
  const [archivedSessions, setArchivedSessions] = useState<ArchivedSession[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  // Track IDs currently animating out
  const [archivingOutIds, setArchivingOutIds] = useState<Set<string>>(new Set());

  // ── Menu & Undo Toast State ─────────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    action: "archive" | "delete";
    session: ChatSession;
    timer: NodeJS.Timeout;
  } | null>(null);

  // ── Fetch archived sessions ───────────────────────────────────────────────
  const fetchArchivedSessions = useCallback(async () => {
    setIsArchiveLoading(true);
    try {
      const res = await fetch("/api/chat/sessions/archived", { cache: "no-store" });
      if (!res.ok) return;
      const payload: { data?: ArchivedSession[]; count?: number } = await res.json();
      if (payload.data) {
        setArchivedSessions(payload.data);
        setArchivedCount(payload.count ?? payload.data.length);
      }
    } catch {
      // keep existing state visible if fetch fails
    } finally {
      setIsArchiveLoading(false);
    }
  }, []);

  // Fetch archive count on mount (for badge)
  useEffect(() => {
    void fetchArchivedSessions();
  }, [fetchArchivedSessions]);

  // Also re-fetch when panel is opened
  useEffect(() => {
    if (isArchivePanelOpen) {
      void fetchArchivedSessions();
    }
  }, [isArchivePanelOpen, fetchArchivedSessions]);

  // ── Toggle archive panel ──────────────────────────────────────────────────
  const toggleArchivePanel = useCallback(() => {
    setIsArchivePanelOpen((prev) => !prev);
  }, []);

  // Close open dropdown menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const refreshSessions = async () => {
      try {
        const response = await fetch("/api/chat/sessions", { cache: "no-store" });
        if (!response.ok) return;
        const payload: { data?: ChatSession[] } = await response.json();
        if (isCurrent && payload.data) setSessions(payload.data);
      } catch {
        // Keep the server-rendered history visible if the refresh fails.
      }
    };

    void refreshSessions();
    window.addEventListener("chat-updated", refreshSessions);
    return () => {
      isCurrent = false;
      window.removeEventListener("chat-updated", refreshSessions);
    };
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        const saved = localStorage.getItem("chatSidebarCollapsed");
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
        localStorage.setItem("chatSidebarCollapsed", String(next));
      }
      return next;
    });
  };

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  function clearSearch() {
    setSearchQuery("");
    setIsSearchOpen(false);
  }

  // ── Active session ─────────────────────────────────────────────────────────
  function isActiveSession(sessionId: string) {
    return pathname === `/chat/${sessionId}`;
  }

  // Group chat sessions chronologically
  const groupedSessions = useMemo(() => {
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const last7Days: ChatSession[] = [];
    const older: ChatSession[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOf7DaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    filteredSessions.forEach((session) => {
      const date = new Date(session.updatedAt);
      if (date >= startOfToday) {
        today.push(session);
      } else if (date >= startOfYesterday) {
        yesterday.push(session);
      } else if (date >= startOf7DaysAgo) {
        last7Days.push(session);
      } else {
        older.push(session);
      }
    });

    return { today, yesterday, last7Days, older };
  }, [filteredSessions]);

  // ── Session Management Actions ─────────────────────────────────────────────
  const handleRename = async (session: ChatSession, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, title: newTitle } : s))
    );
    try {
      await fetch(`/api/chat/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, title: session.title } : s))
      );
    }
  };

  const executeArchive = async (session: ChatSession, shouldArchive: boolean) => {
    try {
      await fetch(`/api/chat/sessions/${session.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: shouldArchive }),
      });
    } catch (err) {
      console.error("Failed to archive/unarchive session:", err);
    }
  };

  const executeDelete = async (session: ChatSession) => {
    try {
      await fetch(`/api/chat/sessions/${session.id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleArchive = (session: ChatSession) => {
    if (toast) clearTimeout(toast.timer);

    // Trigger slide-out animation
    setArchivingOutIds((prev) => new Set(prev).add(session.id));

    // Remove from active list after animation completes
    setTimeout(() => {
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      setArchivingOutIds((prev) => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
    }, 300);

    // Optimistically update archive state
    const archived: ArchivedSession = {
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
    };
    setArchivedSessions((prev) => [archived, ...prev]);
    setArchivedCount((prev) => prev + 1);

    if (isActiveSession(session.id)) {
      router.push("/chat");
    }

    const timer = setTimeout(() => {
      void executeArchive(session, true);
      setToast(null);
    }, 5000);

    setToast({
      message: `"${session.title.slice(0, 18)}${session.title.length > 18 ? "..." : ""}" archived`,
      action: "archive",
      session,
      timer,
    });
  };

  const handleDelete = (session: ChatSession) => {
    if (toast) clearTimeout(toast.timer);

    setSessions((prev) => prev.filter((s) => s.id !== session.id));

    if (isActiveSession(session.id)) {
      router.push("/chat");
    }

    const timer = setTimeout(() => {
      void executeDelete(session);
      setToast(null);
    }, 5000);

    setToast({
      message: `"${session.title.slice(0, 18)}${session.title.length > 18 ? "..." : ""}" deleted`,
      action: "delete",
      session,
      timer,
    });
  };

  const handleUndo = () => {
    if (!toast) return;
    clearTimeout(toast.timer);

    if (toast.action === "archive") {
      // Undo archive: restore to active list & remove from archived
      setSessions((prev) => [toast.session, ...prev]);
      setArchivedSessions((prev) => prev.filter((s) => s.id !== toast.session.id));
      setArchivedCount((prev) => Math.max(0, prev - 1));
    } else {
      // Undo delete: restore to active list
      setSessions((prev) => [toast.session, ...prev]);
    }

    setToast(null);
  };

  // ── Unarchive handler (called from ArchivePanel) ──────────────────────────
  const handleUnarchive = useCallback(
    async (session: ArchivedSession) => {
      // Optimistic: remove from archived panel immediately
      setArchivedSessions((prev) => prev.filter((s) => s.id !== session.id));
      setArchivedCount((prev) => Math.max(0, prev - 1));

      // Optimistic: add back to active sessions list at the top
      setSessions((prev) => [
        { id: session.id, title: session.title, updatedAt: session.updatedAt },
        ...prev,
      ]);

      try {
        await executeArchive(session, false);
      } catch {
        // Roll back on failure
        setArchivedSessions((prev) => [session, ...prev]);
        setArchivedCount((prev) => prev + 1);
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
      {/* Hamburger toggle */}
      <button
        className={styles.hamburgerButton}
        onClick={toggleSidebar}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Menu size={20} />
      </button>

      {/* Header */}
      <div className={styles.sidebarHeader}>
        <h1 className={styles.adminTitle}>
          <Shield size={18} />
          <span className={styles.titleText}>Chat</span>
        </h1>
        <p className={styles.adminSubtitle}>AI Workspace</p>
      </div>

      {/* New Chat Button */}
      <div className={styles.newChatSection}>
        <button
          className={styles.newChatButton}
          onClick={() => {
            if (pathname === "/chat") {
              window.dispatchEvent(new Event("new-chat"));
            } else {
              router.push("/chat");
            }
          }}
        >
          <Plus size={18} />
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* ── [1] Archive Nav Button ──────────────────────────────────────────── */}
      <div style={{ paddingTop: "var(--space-xs)" }}>
        <button
          type="button"
          className={`${styles.archiveNavButton} ${isArchivePanelOpen ? styles.active : ""}`}
          onClick={toggleArchivePanel}
          aria-label="Toggle archive panel"
          aria-expanded={isArchivePanelOpen}
          title="Archived conversations"
        >
          <ArchiveRestore size={16} />
          {!isCollapsed && <span>Archive</span>}
          {archivedCount > 0 && (
            <span className={styles.archiveBadge} aria-label={`${archivedCount} archived chats`}>
              {archivedCount > 99 ? "99+" : archivedCount}
            </span>
          )}
        </button>
      </div>

      {/* Search (only when expanded) */}
      {!isCollapsed && (
        <div className={styles.searchSection}>
          {isSearchOpen ? (
            <div className={styles.searchInputWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                className={styles.searchClearButton}
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              className={styles.searchToggleButton}
              onClick={() => setIsSearchOpen(true)}
            >
              <Search size={14} />
              <span>Search conversations</span>
            </button>
          )}
        </div>
      )}

      {/* Chat History List */}
      <div className={styles.chatList}>
        {!isCollapsed && (
          <>
            {filteredSessions.length > 0 ? (
              <>
                {searchQuery && (
                  <div className={styles.chatListGroup}>
                    <div className={styles.chatListTitle}>Search Results</div>
                    {filteredSessions.map((session) => (
                      <ConversationRow
                        key={session.id}
                        session={session}
                        isActive={isActiveSession(session.id)}
                        isArchivingOut={archivingOutIds.has(session.id)}
                        onRename={handleRename}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        editingSessionId={editingSessionId}
                        setEditingSessionId={setEditingSessionId}
                      />
                    ))}
                  </div>
                )}

                {!searchQuery && (
                  <>
                    {groupedSessions.today.length > 0 && (
                      <div className={styles.chatListGroup} style={{ marginBottom: "16px" }}>
                        <div className={styles.chatListTitle}>Today</div>
                        {groupedSessions.today.map((session) => (
                          <ConversationRow
                            key={session.id}
                            session={session}
                            isActive={isActiveSession(session.id)}
                            isArchivingOut={archivingOutIds.has(session.id)}
                            onRename={handleRename}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            editingSessionId={editingSessionId}
                            setEditingSessionId={setEditingSessionId}
                          />
                        ))}
                      </div>
                    )}

                    {groupedSessions.yesterday.length > 0 && (
                      <div className={styles.chatListGroup} style={{ marginBottom: "16px" }}>
                        <div className={styles.chatListTitle}>Yesterday</div>
                        {groupedSessions.yesterday.map((session) => (
                          <ConversationRow
                            key={session.id}
                            session={session}
                            isActive={isActiveSession(session.id)}
                            isArchivingOut={archivingOutIds.has(session.id)}
                            onRename={handleRename}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            editingSessionId={editingSessionId}
                            setEditingSessionId={setEditingSessionId}
                          />
                        ))}
                      </div>
                    )}

                    {groupedSessions.last7Days.length > 0 && (
                      <div className={styles.chatListGroup} style={{ marginBottom: "16px" }}>
                        <div className={styles.chatListTitle}>Previous 7 Days</div>
                        {groupedSessions.last7Days.map((session) => (
                          <ConversationRow
                            key={session.id}
                            session={session}
                            isActive={isActiveSession(session.id)}
                            isArchivingOut={archivingOutIds.has(session.id)}
                            onRename={handleRename}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            editingSessionId={editingSessionId}
                            setEditingSessionId={setEditingSessionId}
                          />
                        ))}
                      </div>
                    )}

                    {groupedSessions.older.length > 0 && (
                      <div className={styles.chatListGroup} style={{ marginBottom: "16px" }}>
                        <div className={styles.chatListTitle}>Older</div>
                        {groupedSessions.older.map((session) => (
                          <ConversationRow
                            key={session.id}
                            session={session}
                            isActive={isActiveSession(session.id)}
                            isArchivingOut={archivingOutIds.has(session.id)}
                            onRename={handleRename}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            editingSessionId={editingSessionId}
                            setEditingSessionId={setEditingSessionId}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                {searchQuery ? (
                  <>
                    <Search size={28} className={styles.emptyStateIcon} />
                    <p className={styles.emptyStateText}>
                      No conversations match &ldquo;{searchQuery}&rdquo;
                    </p>
                    <button
                      className={styles.emptyStateAction}
                      onClick={clearSearch}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <MessageSquare size={28} className={styles.emptyStateIcon} />
                    <p className={styles.emptyStateText}>
                      No conversations yet.
                      <br />
                      Start a new chat!
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Undo Toast */}
      {toast && (
        <div className={styles.undoToast}>
          <span>{toast.message}</span>
          <button className={styles.undoButton} onClick={handleUndo}>
            <RotateCcw size={12} />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Admin Link (only for admins) */}
      {isAdmin && (
        <Link href="/admin" className={styles.adminLink}>
          <Shield size={16} />
          {!isCollapsed && "Admin Dashboard"}
        </Link>
      )}

      {/* User Profile */}
      <div className={styles.userProfile}>
        <div className={styles.userAvatar}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="User avatar"
              className={styles.avatarImage}
            />
          ) : (
            initials
          )}
        </div>
        {!isCollapsed && (
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userRole}>{user.department}</div>
          </div>
        )}
        <button
          className={styles.logoutButton}
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* ── [3] Floating Archive Panel ─────────────────────────────────────── */}
      <ArchivePanel
        isOpen={isArchivePanelOpen}
        onClose={() => setIsArchivePanelOpen(false)}
        archivedSessions={archivedSessions}
        isLoading={isArchiveLoading}
        onUnarchive={handleUnarchive}
      />
    </aside>
  );
}
