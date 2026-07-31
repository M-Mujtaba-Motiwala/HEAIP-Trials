// =============================================================================
// Chat Page — New chat welcome screen with model selection and starter prompts
// Creates a session on first message and redirects to /chat/[id]
// =============================================================================

"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  FileText,
  Code,
  Lightbulb,
  PenTool,
  Bot,
} from "lucide-react";
import styles from "./chatPage.module.css";
import MarkdownMessage from "./MarkdownMessage";

interface ModelOption { provider: string; modelId: string; displayName: string; isDefault: boolean; }

const SUGGESTIONS = [
  {
    icon: <FileText size={18} />,
    text: "Summarize our quarterly sales report and highlight key trends",
  },
  {
    icon: <Code size={18} />,
    text: "Write a Python script to automate monthly data extraction from our ERP",
  },
  {
    icon: <Lightbulb size={18} />,
    text: "Suggest ways to improve employee engagement in our department",
  },
  {
    icon: <PenTool size={18} />,
    text: "Draft a professional email to announce the new company policy",
  },
];

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  // Focus input and listen to new-chat event
  useEffect(() => {
    const handleNewChat = () => {
      setMessages([]);
      setInput("");
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    };

    window.addEventListener("new-chat", handleNewChat);
    // Focus on mount
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);

    return () => {
      window.removeEventListener("new-chat", handleNewChat);
    };
  }, []);

  useEffect(() => {
    const savedModel = localStorage.getItem("chatSelectedModel");
    void fetch("/api/chat/models", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload: { data?: ModelOption[] } = await response.json();
      if (payload.data?.length) {
        setModels(payload.data);
        setSelectedModel((current) => current || payload.data?.find((model) => model.modelId === savedModel)?.modelId || payload.data?.find((model) => model.isDefault)?.modelId || payload.data?.[0].modelId || "");
      }
    });
  }, []);

  useEffect(() => {
    if (selectedModel) localStorage.setItem("chatSelectedModel", selectedModel);
  }, [selectedModel]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const createRes = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: userMessage.substring(0, 60),
          model: selectedModel || undefined,
        }),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create session");
      }

      const { data: newSession } = await createRes.json();
      if (newSession && newSession.id) {
        window.dispatchEvent(new Event("chat-updated"));
        router.replace(`/chat/${newSession.id}?firstMsg=${encodeURIComponent(userMessage)}&model=${selectedModel}`);
      } else {
        throw new Error("Invalid session data returned");
      }
    } catch {
      setMessages([
        { role: "user", content: userMessage },
        {
          role: "assistant",
          content:
            "Sorry, I couldn't start the conversation. Please try again.",
        },
      ]);
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestionClick(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  const showWelcome = messages.length === 0;

  return (
    <>
      {/* Messages Area or Welcome Screen */}
      {showWelcome ? (
        <div className={styles.welcomeScreen}>
          <div className={styles.welcomeIcon}>
            <Sparkles size={32} />
          </div>
          <h1 className={styles.welcomeTitle}>Hello, {firstName}!</h1>
          <p className={styles.welcomeSubtitle}>
            Choose an AI model and start a conversation. I can help with
            writing, analysis, coding, and much more.
          </p>

          {/* Model Selector */}
          <div className={styles.modelSelector}>
            {models.length === 0 && <p className={styles.modelProvider}>No enabled models are available.</p>}
            {models.map((model) => (
              <div
                key={`${model.provider}:${model.modelId}`}
                className={`${styles.modelCard} ${
                  selectedModel === model.modelId ? styles.selected : ""
                }`}
                onClick={() => setSelectedModel(model.modelId)}
              >
                <div className={styles.modelName}>{model.displayName}</div>
                <div className={styles.modelProvider}>{model.provider}</div>
              </div>
            ))}
          </div>

          {/* Suggestion Cards */}
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((suggestion, i) => (
              <button
                key={i}
                className={styles.suggestionCard}
                onClick={() => handleSuggestionClick(suggestion.text)}
              >
                <div className={styles.suggestionIcon}>{suggestion.icon}</div>
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.messagesArea}>
          <div className={styles.modelBadge}>
            <Bot size={12} />
            {models.find((model) => model.modelId === selectedModel)?.displayName || selectedModel}
          </div>

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.messageRow} ${
                msg.role === "user" ? styles.user : ""
              }`}
            >
              <div
                className={`${styles.messageAvatar} ${styles[msg.role]}`}
              >
                {msg.role === "user" ? firstName[0].toUpperCase() : "AI"}
              </div>
              <div
                className={`${styles.messageBubble} ${styles[msg.role]}`}
              >
                {msg.role === "assistant" ? <MarkdownMessage content={msg.content} /> : msg.content}
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
      )}

      {/* Chat Input */}
      <div className={styles.chatInputArea}>
        <div className={styles.chatInputWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.chatTextarea}
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
