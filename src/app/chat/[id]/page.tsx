// =============================================================================
// Chat Session Page — Loads and displays a persisted conversation
// Phase 4: Added ReactMarkdown rendering + file upload support
// =============================================================================

"use client";

import { useState, useRef, useEffect, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Bot, AlertCircle, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import styles from "../chatPage.module.css";

interface Message {
  id?: string;
  tempId?: string;
  role: "user" | "assistant";
  content: string;
  status?: "pending" | "sent" | "error";
  createdAt?: string;
}

interface UploadedFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

interface SessionData {
  id: string;
  title: string;
  aiModel: string;
  aiProvider: string;
  messages: Message[];
}

const MODEL_NAMES: Record<string, string> = {
  "gemini-2.0-flash": "Gemini Flash",
  "gpt-4o-mini": "GPT-4o Mini",
  "claude-3-5-haiku-latest": "Claude Haiku",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilePreview({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  const isImage = file.mimeType.startsWith("image/");
  return (
    <div className={styles.filePreview}>
      {isImage ? <ImageIcon size={16} /> : <FileText size={16} />}
      <span className={styles.fileName}>{file.fileName}</span>
      <span className={styles.fileSize}>{formatFileSize(file.sizeBytes)}</span>
      <button className={styles.removeFile} onClick={onRemove} aria-label="Remove file">
        <X size={12} />
      </button>
    </div>
  );
}

export default function ChatSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectionRef = useRef({ start: 0, end: 0, focused: false });

  // Restore selection/focus after DOM updates
  useEffect(() => {
    const el = textareaRef.current;
    if (el && selectionRef.current.focused && document.activeElement !== el) {
      el.focus();
      try {
        el.setSelectionRange(selectionRef.current.start, selectionRef.current.end);
      } catch {}
    }
  });

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  // ── Load session from API on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    async function loadSession() {
      setIsLoadingSession(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/chat?sessionId=${sessionId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setLoadError("Conversation not found. It may have been deleted.");
          } else {
            setLoadError("Failed to load conversation. Please try again.");
          }
          return;
        }
        const data: SessionData = await res.json();
        setSessionData(data);
        const serverMsgs: Message[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
          status: "sent",
        }));
        setMessages((prev) => {
          const serverIds = new Set(serverMsgs.map((m) => m.id).filter(Boolean));
          const pendingLocals = prev.filter(
            (m) => (m.status === "pending" || m.status === "error") && m.id && !serverIds.has(m.id)
          );
          return [...serverMsgs, ...pendingLocals];
        });
      } catch {
        setLoadError("Network error loading conversation.");
      } finally {
        setIsLoadingSession(false);
      }
    }

    loadSession();
  }, [sessionId]);

  // ── Auto-resize textarea ────────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // ── Auto-scroll to latest message ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── File upload handler ─────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      setUploadError(null);
      setIsUploading(true);
      try {
        const uploads = await Promise.all(
          files.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("sessionId", sessionId);
            const res = await fetch("/api/chat/attachments", {
              method: "POST",
              body: formData,
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Upload failed");
            }
            const { data } = await res.json();
            return data as UploadedFile;
          })
        );
        setPendingFiles((prev) => [...prev, ...uploads]);
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setIsUploading(false);
        // Reset input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [sessionId]
  );

  const triggerSend = useCallback(
    async (customText?: string) => {
      const textVal = (customText !== undefined ? customText : input).trim();
      if ((!textVal && pendingFiles.length === 0) || isLoading) return;

      setSendError(null);
      const userMessageId = crypto.randomUUID();
      const assistantMessageId = crypto.randomUUID();

      const userContent = [
        textVal,
        pendingFiles.length > 0
          ? `\n[Attached files: ${pendingFiles.map((f) => f.fileName).join(", ")}]`
          : "",
      ]
        .filter(Boolean)
        .join("");

      if (customText === undefined) {
        setInput("");
      }
      setPendingFiles([]);

      // Optimistically add user message with status: pending
      setMessages((prev) => {
        if (prev.some((m) => m.id === userMessageId)) return prev;
        return [
          ...prev,
          { id: userMessageId, tempId: userMessageId, role: "user", content: userContent, status: "pending" },
        ];
      });
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userContent,
            model: sessionData?.aiModel || searchParams.get("model") || "gemini-2.0-flash",
            history: customText !== undefined ? [] : messages,
            sessionId,
            messageId: userMessageId,
            assistantMessageId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Failed to send message" }));
          throw new Error(errData.error || "Failed to get response");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";

        // Optimistically add assistant message placeholder
        setMessages((prev) => {
          if (prev.some((m) => m.id === assistantMessageId)) return prev;
          return [
            ...prev,
            { id: assistantMessageId, tempId: assistantMessageId, role: "assistant", content: "", status: "pending" },
          ];
        });

        if (reader) {
          let lastUpdate = Date.now();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            assistantMessage += chunk;

            const now = Date.now();
            if (now - lastUpdate > 50) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: assistantMessage, status: "pending" }
                    : m
                )
              );
              lastUpdate = now;
            }
          }
          // Finalize: mark both user and assistant as sent
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === assistantMessageId) {
                return { ...m, content: assistantMessage, status: "sent" };
              }
              if (m.id === userMessageId) {
                return { ...m, status: "sent" };
              }
              return m;
            })
          );
        }
      } catch (err: unknown) {
        console.error("Message send failure:", err);
        const errMsg = err instanceof Error ? err.message : "Unable to send message. Please verify connection.";
        setSendError(errMsg);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === userMessageId) return { ...m, status: "error" };
            if (m.id === assistantMessageId)
              return { ...m, status: "error", content: "Failed to generate response." };
            return m;
          })
        );
      } finally {
        window.dispatchEvent(new Event("chat-updated"));
        setIsLoading(false);
      }
    },
    [input, pendingFiles, isLoading, sessionData, sessionId, messages, searchParams]
  );

  const handleSend = () => triggerSend();

  // Auto-send first message on redirection
  useEffect(() => {
    const firstMsg = searchParams.get("firstMsg");
    if (!isLoadingSession && sessionData && messages.length === 0 && firstMsg) {
      // Remove query parameters from URL without reloading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      // Trigger send flow
      triggerSend(firstMsg);
    }
  }, [isLoadingSession, sessionData, messages, searchParams, triggerSend]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoadingSession) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <p>Loading conversation...</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={32} className={styles.errorIcon} />
        <p className={styles.errorText}>{loadError}</p>
        <button
          className={styles.errorButton}
          onClick={() => router.push("/chat")}
        >
          Start New Chat
        </button>
      </div>
    );
  }

  const modelDisplayName =
    MODEL_NAMES[sessionData?.aiModel || ""] ||
    sessionData?.aiModel ||
    "AI Model";

  return (
    <>
      {/* Messages Area */}
      <div className={styles.messagesArea}>
        <div className={styles.modelBadge}>
          <Bot size={12} />
          {modelDisplayName}
        </div>

        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`${styles.messageRow} ${
              msg.role === "user" ? styles.user : ""
            }`}
          >
            <div className={`${styles.messageAvatar} ${styles[msg.role]}`}>
              {msg.role === "user" ? firstName[0].toUpperCase() : "AI"}
            </div>
            <div className={`${styles.messageBubble} ${styles[msg.role]}`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // Open links in new tab
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                    // Ensure code blocks have correct styling
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className={styles.inlineCode}>{children}</code>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
              {msg.status === "error" && (
                <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--color-danger)" }}>
                  <span>Failed to deliver</span>
                  <button
                    onClick={() => triggerSend(msg.content)}
                    type="button"
                    style={{ background: "none", border: "1px solid var(--color-danger)", color: "var(--color-danger)", padding: "2px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className={styles.messageRow}>
            <div className={`${styles.messageAvatar} ${styles.assistant}`}>
              AI
            </div>
            <div className={`${styles.messageBubble} ${styles.assistant}`}>
              <div className={styles.typingIndicator}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className={styles.chatInputArea}>
        {/* Pending file previews */}
        {pendingFiles.length > 0 && (
          <div className={styles.pendingFiles}>
            {pendingFiles.map((f) => (
              <FilePreview
                key={f.id}
                file={f}
                onRemove={() =>
                  setPendingFiles((prev) => prev.filter((p) => p.id !== f.id))
                }
              />
            ))}
          </div>
        )}
        {uploadError && (
          <p className={styles.uploadError}>{uploadError}</p>
        )}
        {sendError && (
          <p className={styles.uploadError} style={{ color: "var(--color-danger)" }}>{sendError}</p>
        )}

        <div className={styles.chatInputWrapper}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.csv,.docx,.xlsx"
            style={{ display: "none" }}
            onChange={handleFileChange}
            aria-label="Upload file"
          />
          {/* Attachment button */}
          <button
            className={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
            title="Attach files"
            type="button"
          >
            {isUploading ? (
              <span className={styles.smallSpinner} />
            ) : (
              <Paperclip size={18} />
            )}
          </button>

          <textarea
            ref={textareaRef}
            className={styles.chatTextarea}
            placeholder="Continue the conversation..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              selectionRef.current = {
                start: e.target.selectionStart || 0,
                end: e.target.selectionEnd || 0,
                focused: true
              };
            }}
            onBlur={() => {
              selectionRef.current.focused = false;
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
