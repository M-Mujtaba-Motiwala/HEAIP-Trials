// =============================================================================
// ArchivePanel — Floating overlay panel for archived chat sessions
//
// Responsibilities:
//   • Renders a fixed, bottom-right corner floating drawer
//   • Fetches archived sessions on mount / when opened
//   • Light-dismiss: closes on outside click
//   • Explicit "X" close button
//   • Scrollable list with per-item "Unarchive" button
//   • Smooth slide-up / fade-in CSS transition
// =============================================================================

"use client";

import { useEffect, useRef, useCallback } from "react";
import { X, ArchiveRestore, Inbox } from "lucide-react";
import styles from "./chat.module.css";

export interface ArchivedSession {
  id: string;
  title: string;
  updatedAt: string;
}

interface ArchivePanelProps {
  isOpen: boolean;
  onClose: () => void;
  archivedSessions: ArchivedSession[];
  isLoading: boolean;
  onUnarchive: (session: ArchivedSession) => void;
}

export default function ArchivePanel({
  isOpen,
  onClose,
  archivedSessions,
  isLoading,
  onUnarchive,
}: ArchivePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Light-dismiss (click outside) ──────────────────────────────────────────
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Defer so the click that opened the panel doesn't immediately close it
      const id = setTimeout(
        () => document.addEventListener("mousedown", handleOutsideClick),
        0
      );
      return () => {
        clearTimeout(id);
        document.removeEventListener("mousedown", handleOutsideClick);
      };
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [isOpen, handleOutsideClick]);

  // ── Format date helper ─────────────────────────────────────────────────────
  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  }

  return (
    <div
      ref={panelRef}
      className={`${styles.archivePanel} ${isOpen ? styles.archivePanelOpen : styles.archivePanelClosed}`}
      role="dialog"
      aria-modal="false"
      aria-label="Archived conversations"
    >
      {/* ── Panel Header ────────────────────────────────────────────────── */}
      <div className={styles.archivePanelHeader}>
        <div className={styles.archivePanelTitle}>
          <ArchiveRestore size={16} />
          <span>Archived Chats</span>
          {archivedSessions.length > 0 && (
            <span className={styles.archivePanelCount}>
              {archivedSessions.length}
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.archivePanelClose}
          onClick={onClose}
          aria-label="Close archive panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Panel Body ──────────────────────────────────────────────────── */}
      <div className={styles.archivePanelBody}>
        {isLoading ? (
          <div className={styles.archivePanelEmpty}>
            <div className={styles.archiveSpinner} />
            <p>Loading…</p>
          </div>
        ) : archivedSessions.length === 0 ? (
          <div className={styles.archivePanelEmpty}>
            <Inbox size={32} className={styles.archivePanelEmptyIcon} />
            <p>No archived chats</p>
          </div>
        ) : (
          <ul className={styles.archivePanelList} role="list">
            {archivedSessions.map((session) => (
              <li key={session.id} className={styles.archivedItem}>
                <div className={styles.archivedItemInfo}>
                  <span className={styles.archivedItemTitle}>
                    {session.title}
                  </span>
                  <span className={styles.archivedItemDate}>
                    {formatDate(session.updatedAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.unarchiveButton}
                  onClick={() => onUnarchive(session)}
                  aria-label={`Unarchive "${session.title}"`}
                  title="Restore to active"
                >
                  <ArchiveRestore size={14} />
                  <span>Restore</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
