"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Menu, X, Plus, ChevronDown, Settings, LogOut, Archive,
  Upload, Image as ImageIcon, Video, Send, Bot,
  AlertTriangle, CheckCircle, Clock, Sparkles, Paperclip,
  MoreVertical, Pencil, Trash2, FileDown,
} from "lucide-react";
import { HamdardLogo } from "@/components/HamdardLogo";
import ThemeToggle from "@/components/ThemeToggle";

interface AttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  url: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: AttachmentItem[];
  imageUrl?: string;
  videoUrl?: string;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  isArchived: boolean;
}

interface ComplianceStatus {
  compliant: boolean;
  reason?: string;
  category?: string;
  quotaRemaining?: number;
}

interface AvailableModel {
  id: string;
  label: string;
  provider: string;
}

const FALLBACK_MODELS: AvailableModel[] = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "Groq" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", provider: "Groq" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B", provider: "Groq" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", provider: "Groq" },
];

const PROMPT_SUGGESTIONS = [
  "Summarize this policy document",
  "Draft a department report",
  "Analyze employee sentiment data",
  "Create an action plan for Q3",
  "Review our compliance checklist",
  "Generate HR onboarding content",
];

export default function ChatPage() {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const complianceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadState, setUploadState] = useState<{ status: "idle" | "uploading" | "done" | "error"; message?: string }>({ status: "idle" });
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>(FALLBACK_MODELS);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [imageLoading, setImageLoading] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoInstruction, setVideoInstruction] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN" || session?.user?.role === "DEPT_MANAGER";

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/chat/sessions", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setSessions(data.data.filter((s: ChatSession) => !s.isArchived));
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/chat/models", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.data) && data.data.length > 0) {
          const models: AvailableModel[] = data.data.map((m: { provider: string; modelId: string; displayName: string }) => ({
            id: m.modelId, label: m.displayName,
            provider: m.provider.charAt(0).toUpperCase() + m.provider.slice(1),
          }));
          setAvailableModels(models);
          setSelectedModel((prev) => models.some((m) => m.id === prev) ? prev : (models[0]?.id ?? prev));
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last?.isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const checkCompliance = useCallback(async (text: string) => {
    if (!text.trim() || text.length < 10) { setCompliance(null); return; }
    setComplianceLoading(true);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      setCompliance(await res.json());
    } catch { setCompliance(null); }
    finally { setComplianceLoading(false); }
  }, []);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (complianceTimeoutRef.current) clearTimeout(complianceTimeoutRef.current);
    complianceTimeoutRef.current = setTimeout(() => checkCompliance(val), 800);
  };

  const startNewChat = () => { setMessages([]); setCurrentSessionId(null); setInputValue(""); setCompliance(null); setPendingAttachments([]); setSidebarOpen(false); };

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId); setPendingAttachments([]); setSidebarOpen(false);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      const data = await res.json();
      if (data.data) setMessages(data.data.map((m: { id: string; role: string; content: string; createdAt: string; attachments?: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; storageKey: string }> }) => ({
        id: m.id, role: m.role, content: m.content, timestamp: new Date(m.createdAt),
        attachments: (m.attachments ?? []).map((a) => ({ id: a.id, fileName: a.fileName, mimeType: a.mimeType, sizeBytes: a.sizeBytes, url: `/uploads/chat/${a.storageKey}` })),
      })));
    } catch {}
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (compliance && !compliance.compliant) return;
    const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content: inputValue.trim(), timestamp: new Date(), attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined };
    const sentAttachmentIds = pendingAttachments.map((a) => a.id);
    setMessages((prev) => [...prev, userMessage]); setPendingAttachments([]);
    const sentText = inputValue; setInputValue(""); setIsLoading(true); setCompliance(null);
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true }]);
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: sentText, model: selectedModel, sessionId: currentSessionId, attachmentIds: sentAttachmentIds, history: messages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) { const errBody = await res.json().catch(() => null); throw new Error(errBody?.reason || errBody?.error || "Failed to get response"); }
      const newSessionId = res.headers.get("x-session-id");
      if (newSessionId && !currentSessionId) {
        setCurrentSessionId(newSessionId);
        fetch("/api/chat/sessions").then((r) => r.json()).then((data) => { if (data.data) setSessions(data.data.filter((s: ChatSession) => !s.isArchived)); });
      }
      const reader = res.body?.getReader(); const decoder = new TextDecoder(); let fullText = "";
      if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; fullText += decoder.decode(value, { stream: true }).replace(/__metadata:.*?__\n?/g, ""); setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText, isStreaming: true } : m)); } }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText, isStreaming: false } : m));
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "";
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: reason ? `⚠️ ${reason}` : "An error occurred.", isStreaming: false } : m));
    } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const ensureSession = async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;
    try { const res = await fetch("/api/chat/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New Chat", model: selectedModel }) }); const data = await res.json(); if (data.data?.id) { setCurrentSessionId(data.data.id); return data.data.id; } } catch {} return null;
  };

  const refreshSessions = async () => { try { const res = await fetch("/api/chat/sessions"); const data = await res.json(); if (data.data) setSessions(data.data.filter((s: ChatSession) => !s.isArchived)); } catch {} };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setUploadState({ status: "uploading", message: file.name });
    try {
      const sessionId = await ensureSession();
      if (!sessionId) { setUploadState({ status: "error", message: "Could not create a chat session." }); return; }
      const formData = new FormData(); formData.append("sessionId", sessionId); formData.append("file", file);
      const res = await fetch("/api/chat/attachments", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error || "Upload failed"); }
      const result = await res.json();
      if (result.data) setPendingAttachments((prev) => [...prev, { id: result.data.id, fileName: result.data.fileName, mimeType: result.data.mimeType, sizeBytes: result.data.sizeBytes, url: result.data.url }]);
      setUploadState({ status: "done", message: `${file.name} uploaded` }); await refreshSessions();
    } catch (err) { setUploadState({ status: "error", message: err instanceof Error ? err.message : "Upload failed" }); }
  };

  const removePendingAttachment = (id: string) => setPendingAttachments((prev) => prev.filter((a) => a.id !== id));

  const handleGenerateImage = async () => {
    const prompt = imagePrompt.trim(); if (!prompt || imageLoading) return;
    setImageLoading(true); setImageError(null);
    try {
      const res = await fetch("/api/chat/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, sessionId: currentSessionId, size: imageSize }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Image generation failed");
      const { messageId, imageUrl, sessionId } = data.data;
      if (sessionId) setCurrentSessionId(sessionId);
      setMessages((prev) => [...prev, { id: messageId || `image-${Date.now()}`, role: "assistant", content: `Generated image: ${prompt}`, timestamp: new Date(), imageUrl }]);
      setImageModalOpen(false); setImagePrompt(""); await refreshSessions();
    } catch (err) { setImageError(err instanceof Error ? err.message : "Image generation failed"); }
    finally { setImageLoading(false); }
  };

  const handleEditVideo = async () => {
    if (!videoFile || !videoInstruction.trim() || videoLoading) return;
    setVideoLoading(true); setVideoError(null);
    try {
      const formData = new FormData(); formData.append("sessionId", currentSessionId ?? ""); formData.append("instruction", videoInstruction.trim()); formData.append("file", videoFile);
      const res = await fetch("/api/chat/video", { method: "POST", body: formData });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Video processing failed");
      const { messageId, videoUrl, sessionId } = data.data;
      if (sessionId) setCurrentSessionId(sessionId);
      setMessages((prev) => [...prev, { id: messageId || `video-${Date.now()}`, role: "assistant", content: `Video edit: "${videoInstruction.trim()}"`, timestamp: new Date(), videoUrl }]);
      setVideoModalOpen(false); setVideoInstruction(""); setVideoFile(null); await refreshSessions();
    } catch (err) { setVideoError(err instanceof Error ? err.message : "Video processing failed"); }
    finally { setVideoLoading(false); }
  };

  const openContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const menuW = 192;
    const menuH = 200;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setContextMenu({ sessionId, x: Math.max(0, x), y: Math.max(0, y) });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (contextMenu) {
      const handler = () => closeContextMenu();
      window.addEventListener("click", handler);
      window.addEventListener("scroll", handler, true);
      return () => { window.removeEventListener("click", handler); window.removeEventListener("scroll", handler, true); };
    }
  }, [contextMenu]);

  const handleRenameSession = async (sessionId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === sessions.find((s) => s.id === sessionId)?.title) { setRenamingSessionId(null); return; }
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: trimmed }) });
      if (!res.ok) throw new Error("Rename failed");
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, title: trimmed } : s));
    } catch { setSessionError("Failed to rename chat"); setTimeout(() => setSessionError(null), 3000); }
    setRenamingSessionId(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    closeContextMenu();
    if (!confirm("Delete this chat? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) { setCurrentSessionId(null); setMessages([]); }
    } catch { setSessionError("Failed to delete chat"); setTimeout(() => setSessionError(null), 3000); }
  };

  const handleArchiveSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isArchived: true }) });
      if (!res.ok) throw new Error("Archive failed");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) { setCurrentSessionId(null); setMessages([]); }
    } catch { setSessionError("Failed to archive chat"); setTimeout(() => setSessionError(null), 3000); }
    closeContextMenu();
  };

  const handleExportChat = async (sessionId: string) => {
    closeContextMenu();
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      const data = await res.json();
      const chatMessages: Array<{ role: string; content: string; createdAt: string }> = data.data || [];
      const lines = chatMessages.map((m) => {
        const role = m.role === "user" ? "You" : "AI";
        const time = new Date(m.createdAt).toLocaleString();
        return `[${time}] ${role}:\n${m.content}`;
      });
      const content = lines.join("\n\n---\n\n");
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-${sessionId.slice(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  const selectedModelLabel = availableModels.find((m) => m.id === selectedModel)?.label || selectedModel;
  const formatBytes = (bytes?: number) => { if (!bytes || bytes <= 0) return ""; if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; };

  const renderAttachments = (attachments?: AttachmentItem[]) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="flex flex-col gap-2 mt-2">
        {attachments.map((a) => a.mimeType.startsWith("image/") ? (
          <img key={a.id} src={a.url} alt={a.fileName} className="max-h-80 w-auto rounded-lg border border-border" />
        ) : (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border">
            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{a.fileName}</span>
            {a.sizeBytes ? <span className="text-muted-foreground/60 flex-shrink-0">{formatBytes(a.sizeBytes)}</span> : null}
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r border-border transition-all duration-300 ${sidebarOpen ? "w-64" : "w-16"} ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"}`}>
        <div className={`flex items-center border-b border-border ${sidebarOpen ? "justify-between px-4 py-3" : "justify-center py-3"}`}>
          {sidebarOpen && <HamdardLogo className="w-9 h-9" />}
          <button onClick={() => setSidebarOpen((v) => !v)} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
            {sidebarOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5 text-primary" />}
          </button>
        </div>

        <div className="py-3 px-2">
          <button onClick={startNewChat} className={`flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors text-sm ${sidebarOpen ? "w-full px-4 py-2.5" : "w-10 h-10 mx-auto justify-center"}`}>
            <Plus className="w-5 h-5 flex-shrink-0" />{sidebarOpen && <span>New Chat</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {sidebarOpen ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Recent</p>
              {sessions.length === 0 ? <p className="text-xs text-muted-foreground/60 px-2 italic">No chats yet</p> : sessions.slice(0, 20).map((s) => (
                renamingSessionId === s.id ? (
                  <div key={s.id} className="px-2 py-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenameSession(s.id); if (e.key === "Escape") setRenamingSessionId(null); }}
                      onBlur={() => handleRenameSession(s.id)}
                      className="w-full px-2 py-1.5 bg-muted border border-primary rounded-lg text-sm text-foreground focus:outline-none"
                    />
                  </div>
                ) : (
                <div key={s.id} className={`group flex items-center gap-1 rounded-lg text-sm transition-colors ${currentSessionId === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                  <button onClick={() => loadSession(s.id)} className="flex-1 text-left px-3 py-2 truncate flex items-center gap-2 min-w-0">
                    <Bot className="w-3.5 h-3.5 flex-shrink-0 opacity-50" /><span className="truncate">{s.title}</span>
                  </button>
                  <button
                    onClick={(e) => openContextMenu(e, s.id)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all flex-shrink-0"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
                )
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 pt-2"><Bot className="w-5 h-5 text-muted-foreground/40" /><span className="text-[10px] text-muted-foreground/40">{sessions.length}</span></div>
          )}
        </div>

        <div className="px-2 pb-1">
          <a href="/chat/archive" className={`flex items-center rounded-lg text-sm transition-colors ${sidebarOpen ? "gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent" : "w-10 h-10 mx-auto justify-center text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <Archive className="w-5 h-5 flex-shrink-0" />{sidebarOpen && <span>Archive</span>}
          </a>
        </div>

        <div className="border-t border-border py-2 space-y-1">
          {isAdmin && <a href="/admin" className={`flex items-center rounded-lg text-sm transition-colors ${sidebarOpen ? "gap-2 px-3 py-2 text-primary hover:bg-primary/10" : "w-10 h-10 mx-auto justify-center text-primary hover:bg-primary/10"}`}><Settings className="w-5 h-5 flex-shrink-0" />{sidebarOpen && <span>Admin</span>}</a>}
          <ThemeToggle collapsed={!sidebarOpen} />
          <div className={`border-t border-border ${sidebarOpen ? "pt-1" : "pt-2"}`}>
            <div className={`flex items-center gap-3 ${sidebarOpen ? "px-3 py-2" : "justify-center py-2"}`}>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">{session?.user?.name?.slice(0, 1).toUpperCase() || "U"}</div>
              {sidebarOpen && <div className="min-w-0"><p className="text-sm font-medium truncate">{session?.user?.name || "User"}</p><p className="text-xs text-muted-foreground truncate">{session?.user?.role || "EMPLOYEE"}</p></div>}
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className={`flex items-center rounded-lg text-sm transition-colors ${sidebarOpen ? "gap-2 px-3 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full" : "w-10 h-10 mx-auto justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}>
              <LogOut className="w-5 h-5 flex-shrink-0" />{sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {sessionError && (
        <div className="fixed top-4 right-4 z-[200] bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2.5 rounded-xl text-sm shadow-lg animate-in fade-in slide-in-from-top-2">
          {sessionError}
        </div>
      )}

      {/* ── Main ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => setSidebarOpen((v) => !v)} className="p-2 hover:bg-accent rounded-lg transition-colors lg:hidden"><Menu className="w-5 h-5" /></button>
          <div className="relative">
            <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/80 border border-border rounded-lg text-sm transition-colors">
              <Sparkles className="w-4 h-4 text-primary" />{selectedModelLabel}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {modelDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50">
                {availableModels.map((m) => (
                  <button key={m.id} onClick={() => { setSelectedModel(m.id); setModelDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-accent text-sm transition-colors flex items-center justify-between ${selectedModel === m.id ? "bg-primary/10 text-primary" : "text-foreground"}`}>
                    <span>{m.label}</span><span className="text-xs text-muted-foreground font-mono">{m.provider}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1" />
          {compliance && <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border ${compliance.compliant ? "bg-primary/10 border-primary/20 text-primary" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
            {compliance.compliant ? <><CheckCircle className="w-3.5 h-3.5" /> Compliant</> : <><AlertTriangle className="w-3.5 h-3.5" /> Violation</>}
          </div>}
          <div className="text-xs text-muted-foreground hidden md:block">{session?.user?.name} · {session?.user?.department}</div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full p-8 text-center">
              <HamdardLogo className="w-16 h-16 mx-auto mb-4 opacity-80" />
              <h1 className="text-2xl font-bold mb-1">Hello, {session?.user?.name?.split(" ")[0] || "there"}</h1>
              <p className="text-muted-foreground mb-6">How can I help you today?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full max-w-2xl">
                {PROMPT_SUGGESTIONS.map((p) => (
                  <button key={p} onClick={() => setInputValue(p)}
                    className="p-3 border border-border bg-card hover:bg-accent hover:border-primary/30 rounded-xl text-left text-sm text-muted-foreground hover:text-foreground transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-4 h-4 text-primary-foreground" /></div>}
                  <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.imageUrl && <div className="mt-2"><img src={msg.imageUrl} alt={msg.content} className="max-h-80 w-auto rounded-lg border border-border" /></div>}
                    {msg.videoUrl && <div className="mt-2"><video src={msg.videoUrl} controls className="max-h-80 w-auto max-w-full rounded-lg border border-border" /></div>}
                    {renderAttachments(msg.attachments)}
                    {msg.isStreaming && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse rounded-sm" />}
                  </div>
                  {msg.role === "user" && <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">{session?.user?.name?.slice(0, 1).toUpperCase() || "U"}</div>}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input (sticky bottom) ── */}
        <div className="sticky bottom-0 border-t border-border bg-background/90 backdrop-blur-md p-4">
          {compliance && !compliance.compliant && (
            <div className="max-w-3xl mx-auto mb-3 flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div><p className="font-semibold">Policy Violation</p><p className="mt-0.5 opacity-80">{compliance.reason}</p></div>
            </div>
          )}
          <div className="max-w-3xl mx-auto">
            {/* Pending attachments */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingAttachments.map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted border border-border rounded-lg text-xs text-muted-foreground">
                    <Paperclip className="w-3 h-3 text-primary" /><span className="max-w-[140px] truncate">{a.fileName}</span>
                    <button onClick={() => removePendingAttachment(a.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <input ref={fileInputRef} type="file" accept=".txt,.csv,.pdf,.json,.png,.jpg,.jpeg,.webp,.docx,.xlsx" className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadState.status === "uploading"} title="Attach file"
                className="p-3 rounded-xl border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex-shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <textarea ref={inputRef} value={inputValue} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Message..." rows={1}
                  className="w-full bg-muted border border-border focus:border-primary/50 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder-muted-foreground text-foreground text-sm resize-none transition-all"
                  style={{ minHeight: "48px", maxHeight: "200px" }}
                  onInput={(e: FormEvent<HTMLTextAreaElement>) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; }} />
              </div>
              <button onClick={handleSend}
                disabled={isLoading || !inputValue.trim() || (compliance !== null && !compliance.compliant)}
                className="p-3 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground rounded-xl transition-all flex-shrink-0">
                {isLoading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            {/* Toolbar row */}
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setImageModalOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                <ImageIcon className="w-3.5 h-3.5" /> Image
              </button>
              <button onClick={() => setVideoModalOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                <Video className="w-3.5 h-3.5" /> Video
              </button>
              {uploadState.status === "uploading" && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3 animate-spin" /> Uploading...</span>}
              {uploadState.status === "done" && <span className="text-xs text-primary flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {uploadState.message}</span>}
              {uploadState.status === "error" && <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {uploadState.message}</span>}
              {complianceLoading && <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto"><Clock className="w-3 h-3 animate-spin" /> Checking...</span>}
              {compliance?.compliant && !complianceLoading && <span className="text-xs text-primary flex items-center gap-1 ml-auto"><CheckCircle className="w-3 h-3" /> Compliant</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-card border border-border rounded-xl shadow-xl py-1.5 w-48"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const s = sessions.find((ss) => ss.id === contextMenu.sessionId);
              if (s) { setRenamingSessionId(s.id); setRenameValue(s.title); }
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Rename
          </button>
          <button
            onClick={() => handleExportChat(contextMenu.sessionId)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-muted-foreground" /> Export (.txt)
          </button>
          <button
            onClick={() => handleArchiveSession(contextMenu.sessionId)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Archive className="w-3.5 h-3.5 text-muted-foreground" /> Archive
          </button>
          <div className="mx-3 my-1 border-t border-border" />
          <button
            onClick={() => handleDeleteSession(contextMenu.sessionId)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}

      {/* ── Image Modal ── */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !imageLoading && setImageModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Generate Image</h2>
              <button onClick={() => setImageModalOpen(false)} disabled={imageLoading} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Describe your image</label>
                <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="A professional office with Hamdard branding..."
                  rows={3} className="w-full bg-muted border border-border focus:border-primary/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder-muted-foreground text-foreground text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Size</label>
                <div className="flex gap-2">
                  {[{ v: "1024x1024", l: "Square" }, { v: "1024x1792", l: "Portrait" }, { v: "1792x1024", l: "Landscape" }].map((s) => (
                    <button key={s.v} onClick={() => setImageSize(s.v)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${imageSize === s.v ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>
              {imageError && <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{imageError}</span></div>}
            </div>
            <div className="px-5 pb-5">
              <button onClick={handleGenerateImage} disabled={!imagePrompt.trim() || imageLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm">
                {imageLoading ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Video Modal ── */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !videoLoading && setVideoModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Edit Video</h2>
              <button onClick={() => setVideoModalOpen(false)} disabled={videoLoading} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Upload video</label>
                <label className="block w-full cursor-pointer bg-muted border border-dashed border-border hover:border-primary/40 rounded-xl py-6 text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <input type="file" accept=".mp4,.webm,.mov,.mpeg,.mpg,.avi" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
                  {videoFile ? (
                    <span className="text-primary flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> {videoFile.name}</span>
                  ) : (
                    <span className="flex flex-col items-center justify-center gap-1"><Upload className="w-5 h-5" /> Click to select a video<br /><span className="text-xs text-muted-foreground/60">MP4, WebM, MOV — max 50 MB</span></span>
                  )}
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Edit instructions</label>
                <textarea value={videoInstruction} onChange={(e) => setVideoInstruction(e.target.value)}
                  placeholder="Add captions, trim to 30s, add intro..."
                  rows={2} className="w-full bg-muted border border-border focus:border-primary/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder-muted-foreground text-foreground text-sm resize-none" />
              </div>
              {videoError && <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{videoError}</span></div>}
            </div>
            <div className="px-5 pb-5">
              <button onClick={handleEditVideo} disabled={!videoFile || !videoInstruction.trim() || videoLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm">
                {videoLoading ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Processing...</> : <><Sparkles className="w-4 h-4" /> Apply Edit</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
