// =============================================================================
// Chat API Route — Handles AI chat requests with multi-provider support
// Persists sessions and messages to the database
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Provider-specific model prefixes for routing
const PROVIDER_MAP: Record<string, string> = {
  "gpt-": "openai",
  "gemini-": "gemini",
  "claude-": "anthropic",
};

function getProvider(modelId: string): string {
  for (const [prefix, provider] of Object.entries(PROVIDER_MAP)) {
    if (modelId.startsWith(prefix)) return provider;
  }
  return "gemini"; // default
}

/** Derive a short session title from the first user message */
function deriveTitle(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= 60) return trimmed;
  return trimmed.slice(0, 57) + "...";
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, model, history = [], sessionId: existingSessionId, messageId, assistantMessageId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let provider = "gemini";
    let selectedModel = model || "gemini-2.0-flash";

    try {
      const registryModel = model
        ? await db.aiModel.findFirst({ where: { modelId: model, enabled: true } })
        : await db.aiModel.findFirst({ where: { enabled: true, isDefault: true } })
          ?? await db.aiModel.findFirst({ where: { enabled: true }, orderBy: { createdAt: "asc" } });

      if (registryModel) {
        provider = registryModel.provider;
        selectedModel = registryModel.modelId;
      } else {
        provider = getProvider(selectedModel);
      }
    } catch (err) {
      console.warn("AiModel lookup fallback triggered:", err);
      provider = getProvider(selectedModel);
    }

    // ── Resolve or create ChatSession ──────────────────────────────────────
    let chatSessionId: string;
    const isNewSession = !existingSessionId;

    if (existingSessionId) {
      // Validate session belongs to this user
      const existing = await db.chatSession.findFirst({
        where: { id: existingSessionId, employeeId: session.user.id },
      });
      if (!existing) {
        console.warn(`[WARN] Session ${existingSessionId} not found or unauthorized for user ${session.user.id}`);
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      chatSessionId = existing.id;
    } else {
      // Create a new session with the first message as the title
      console.log(`[INFO] Creating new chat session for user ${session.user.id}`);
      const newSession = await db.chatSession.create({
        data: {
          employeeId: session.user.id,
          title: deriveTitle(message),
          aiProvider: provider,
          aiModel: selectedModel,
        },
      });
      chatSessionId = newSession.id;
    }

    // ── Idempotency Check & Persist User Message ──────────────────────────
    if (messageId) {
      const existingMsg = await db.message.findUnique({ where: { id: messageId } });
      if (existingMsg) {
        console.log(`[INFO] Duplicate request detected for messageId ${messageId}. Skipping user message creation.`);
        return NextResponse.json({ status: "success", duplicated: true });
      }
    }

    console.log(`[INFO] Persisting user message ${messageId || "new"} for session ${chatSessionId}`);
    await db.message.create({
      data: {
        id: messageId || undefined,
        sessionId: chatSessionId,
        role: "user",
        content: message,
      },
    });

    // ── Check API key availability ────────────────────────────────────────
    const apiKeys: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
    };

    // ── Build conversation context from history ───────────────────────────
    const conversationMessages = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    if (!apiKeys[provider]) {
      // Demo mode: mock response
      const mockResponse = getMockResponse(message);

      console.log(`[INFO] Persisting assistant message ${assistantMessageId || "new"} for session ${chatSessionId}`);
      // Persist assistant mock message
      await db.message.create({
        data: {
          id: assistantMessageId || undefined,
          sessionId: chatSessionId,
          role: "assistant",
          content: mockResponse,
        },
      });

      // Log usage
      await db.usageLog.create({
        data: {
          employeeId: session.user.id,
          aiProvider: provider,
          aiModel: selectedModel,
          tokensInput: message.length,
          tokensOutput: mockResponse.length,
          costUsd: 0,
          department: session.user.department,
        },
      });

      // Update session updatedAt
      await db.chatSession.update({
        where: { id: chatSessionId },
        data: { updatedAt: new Date() },
      });

      // Stream the mock response with a sessionId header so client can navigate
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const words = mockResponse.split(" ");
          for (let i = 0; i < words.length; i++) {
            const word = (i === 0 ? "" : " ") + words[i];
            controller.enqueue(encoder.encode(word));
            await new Promise((r) => setTimeout(r, 30 + Math.random() * 40));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "X-Session-Id": chatSessionId,
          "X-Is-New-Session": isNewSession ? "true" : "false",
        },
      });
    }

    // ── Real AI provider integration ──────────────────────────────────────
    let fullAssistantResponse = "";

    const encoder = new TextEncoder();
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = stream.writable.getWriter();

    // Run AI call + write to stream in background
    (async () => {
      try {
        if (provider === "gemini") {
          const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
          const { streamText } = await import("ai");
          const google = createGoogleGenerativeAI({ apiKey: apiKeys.gemini });
          const result = streamText({
            model: google(selectedModel),
            messages: conversationMessages,
            system:
              "You are a helpful AI assistant for Hamdard Pakistan employees. Be professional, concise, and helpful.",
          });
          for await (const chunk of (await result).textStream) {
            fullAssistantResponse += chunk;
            await writer.write(encoder.encode(chunk));
          }
        } else if (provider === "openai") {
          const { createOpenAI } = await import("@ai-sdk/openai");
          const { streamText } = await import("ai");
          const openai = createOpenAI({ apiKey: apiKeys.openai });
          const result = streamText({
            model: openai(selectedModel),
            messages: conversationMessages,
            system:
              "You are a helpful AI assistant for Hamdard Pakistan employees. Be professional, concise, and helpful.",
          });
          for await (const chunk of (await result).textStream) {
            fullAssistantResponse += chunk;
            await writer.write(encoder.encode(chunk));
          }
        } else {
          const { createAnthropic } = await import("@ai-sdk/anthropic");
          const { streamText } = await import("ai");
          const anthropic = createAnthropic({ apiKey: apiKeys.anthropic });
          const result = streamText({
            model: anthropic(selectedModel),
            messages: conversationMessages,
            system:
              "You are a helpful AI assistant for Hamdard Pakistan employees. Be professional, concise, and helpful.",
          });
          for await (const chunk of (await result).textStream) {
            fullAssistantResponse += chunk;
            await writer.write(encoder.encode(chunk));
          }
        }
      } catch (err) {
        console.error("AI streaming error:", err);
        const errorMsg = "I encountered an error generating a response. Please try again.";
        fullAssistantResponse = errorMsg;
        await writer.write(encoder.encode(errorMsg));
      } finally {
        await writer.close();

        // Persist assistant message after streaming completes
        console.log(`[INFO] Persisting assistant message ${assistantMessageId || "new"} for session ${chatSessionId}`);
        await db.message.create({
          data: {
            id: assistantMessageId || undefined,
            sessionId: chatSessionId,
            role: "assistant",
            content: fullAssistantResponse,
          },
        });

        // Update session timestamp
        await db.chatSession.update({
          where: { id: chatSessionId },
          data: { updatedAt: new Date() },
        });

        // Log usage (approximate tokens)
        await db.usageLog.create({
          data: {
            employeeId: session.user.id,
            aiProvider: provider,
            aiModel: selectedModel,
            tokensInput: message.length,
            tokensOutput: fullAssistantResponse.length,
            costUsd: 0,
            department: session.user.department,
          },
        });
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Session-Id": chatSessionId,
        "X-Is-New-Session": isNewSession ? "true" : "false",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    try {
      const fs = require("fs");
      const path = require("path");
      fs.appendFileSync(
        path.join(process.cwd(), "error.log"),
        `[${new Date().toISOString()}] Chat API error: ${error instanceof Error ? error.stack || error.message : String(error)}\n`
      );
    } catch {}
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Session management endpoints ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const chatSession = await db.chatSession.findFirst({
    where: { id: sessionId, employeeId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: chatSession.id,
    title: chatSession.title,
    aiModel: chatSession.aiModel,
    aiProvider: chatSession.aiProvider,
    messages: chatSession.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

/**
 * Mock responses for demo mode (no API key configured).
 */
function getMockResponse(message: string): string {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
    return "Hello! 👋 I'm the Hamdard AI Assistant. I'm here to help you with writing, analysis, coding, brainstorming, and much more. This is currently running in demo mode — once an API key is configured, I'll be powered by a real AI model. How can I assist you today?";
  }

  if (lowerMsg.includes("report") || lowerMsg.includes("summary")) {
    return "I'd be happy to help with report summaries! In production mode with a real AI API key, I can:\n\n• Analyze and summarize lengthy documents\n• Extract key metrics and trends\n• Generate executive summaries\n• Create bullet-point highlights\n\nTo enable full AI capabilities, please ask your administrator to configure an API key in the platform settings.";
  }

  if (lowerMsg.includes("code") || lowerMsg.includes("script") || lowerMsg.includes("python")) {
    return "I can help with coding tasks! In production mode, I'll be able to:\n\n• Write code in Python, JavaScript, SQL, and more\n• Debug existing code\n• Explain complex algorithms\n• Generate automation scripts\n\nThis is currently a demo response. Configure an AI API key to unlock full coding assistance.";
  }

  if (lowerMsg.includes("email") || lowerMsg.includes("write") || lowerMsg.includes("draft")) {
    return "I'd love to help you draft that! When fully configured with an AI API key, I can:\n\n• Draft professional emails and memos\n• Write reports and proposals\n• Create presentations outlines\n• Edit and improve existing content\n\nThis is a demo response — contact your IT administrator to set up an API key for full functionality.";
  }

  return `Thank you for your message! I received: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"\n\nI'm currently running in **demo mode** without a connected AI model. Here's what I can do when fully configured:\n\n• 💬 Natural language conversations\n• 📊 Data analysis and reporting\n• ✍️ Content writing and editing\n• 💻 Code generation and debugging\n• 🧠 Brainstorming and ideation\n\nTo enable real AI responses, add your API key (OpenAI, Google Gemini, or Anthropic) to the .env.local file.`;
}
