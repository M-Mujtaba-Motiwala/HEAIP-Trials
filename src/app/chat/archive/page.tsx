"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, RotateCcw, Trash2, Bot, Loader2 } from "lucide-react";
import { HamdardLogo } from "@/components/HamdardLogo";

interface ArchivedSession {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ArchivePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchArchived = useCallback(() => {
    setLoading(true);
    fetch("/api/chat/sessions/archived")
      .then((r) => r.json())
      .then((d) => setSessions(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchArchived, 0);
    return () => clearTimeout(t);
  }, [fetchArchived]);

  const unarchive = async (id: string) => {
    setBusyId(id);
    try {
      await fetch(`/api/chat/sessions/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      router.push("/chat");
    } catch {}
    setBusyId(null);
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this chat permanently? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
      fetchArchived();
    } catch {}
    setBusyId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-emerald-900/20 bg-[#061A12] px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <HamdardLogo className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-white">Archived Chats</h1>
              <p className="text-xs text-slate-400">Restore or permanently delete archived sessions</p>
            </div>
          </div>
          <a
            href="/chat"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-900/30 text-emerald-300 rounded-lg text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </a>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <span className="text-sm">Loading archived chats…</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Archive className="w-14 h-14 text-slate-700 mb-4" />
            <h3 className="text-lg font-semibold text-slate-400">No archived chats</h3>
            <p className="text-sm text-slate-500 mt-1">Archived sessions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-4 p-4 bg-slate-800/60 border border-emerald-900/20 rounded-xl hover:border-[#8DC63F]/30 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#005830]/40 border border-[#8DC63F]/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-[#8DC63F]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      Last updated {new Date(s.updatedAt).toLocaleString("en-PK", { hour12: false })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => unarchive(s.id)}
                    disabled={busyId === s.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-300 rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    disabled={busyId === s.id}
                    className="p-1.5 hover:bg-red-900/20 rounded-lg transition-colors text-red-400 disabled:opacity-50"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
