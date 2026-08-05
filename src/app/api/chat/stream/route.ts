import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMonthlyQuotaPKR, getMonthlySpendPKR } from "@/lib/quota";
import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { readFile } from "node:fs/promises";
import path from "node:path";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 30;

const TEXT_MIMES = new Set([
  "text/plain", "text/csv", "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

async function readAttachmentContent(attachment: { storageKey: string; mimeType: string; fileName: string }): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "chat");
  const filePath = path.join(uploadDir, attachment.storageKey);

  if (attachment.mimeType === "application/pdf") {
    return `[PDF file: ${attachment.fileName} — uploaded and available for reference]`;
  }
  if (attachment.mimeType.startsWith("image/")) {
    return `[Image file: ${attachment.fileName} — ${attachment.mimeType}]`;
  }
  if (TEXT_MIMES.has(attachment.mimeType)) {
    try {
      const buf = await readFile(filePath);
      // Check for null bytes (binary content disguised as text)
      if (buf.includes(0)) {
        return `[File: ${attachment.fileName} — binary content, cannot read as text]`;
      }
      const text = buf.toString("utf-8");
      const truncated = text.length > 8000 ? text.slice(0, 8000) + "\n... [truncated]" : text;
      return `[File: ${attachment.fileName}]\n\`\`\`\n${truncated}\n\`\`\``;
    } catch {
      return `[File: ${attachment.fileName} — could not read content]`;
    }
  }
  return `[File: ${attachment.fileName} — ${attachment.mimeType}]`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: {
      message?: string;
      model?: string;
      sessionId?: string;
      attachmentIds?: string[];
      history?: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
    } = await req.json();
    const { message, model, history = [], sessionId, attachmentIds = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Resolve model from registry
    const selectedModel = model || "llama-3.3-70b-versatile";

    const dbModel = await db.aiModel.findFirst({
      where: { modelId: selectedModel, enabled: true },
    });

    if (!dbModel) {
      return NextResponse.json({ error: `Model "${selectedModel}" is not available.` }, { status: 400 });
    }

    let inputCostPer1K = 0;
    let outputCostPer1K = 0;
    if (dbModel.metadataJson) {
      try {
        const meta = JSON.parse(dbModel.metadataJson);
        if (typeof meta.inputCostPer1K === "number") inputCostPer1K = meta.inputCostPer1K;
        if (typeof meta.outputCostPer1K === "number") outputCostPer1K = meta.outputCostPer1K;
      } catch { /* ignore */ }
    }

    // 2. Resolve ChatSession
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const newSession = await db.chatSession.create({
        data: {
          employeeId: session.user.id,
          title: message.slice(0, 60),
          aiProvider: dbModel.provider,
          aiModel: selectedModel,
        },
      });
      currentSessionId = newSession.id;
    } else {
      const existing = await db.chatSession.findUnique({
        where: { id: currentSessionId },
        select: { employeeId: true },
      });
      const requesterRole = session.user.role || "";
      const isOwner = existing?.employeeId === session.user.id;
      const isAdmin = requesterRole === "SUPER_ADMIN" || requesterRole === "ADMIN";
      if (!existing || (!isOwner && !isAdmin)) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }
    }

    // 3. Quota enforcement
    const [monthlySpend, monthlyQuota] = await Promise.all([
      getMonthlySpendPKR(session.user.id),
      getMonthlyQuotaPKR(),
    ]);
    if (monthlySpend >= monthlyQuota) {
      return NextResponse.json(
        {
          error: "QUOTA_EXCEEDED",
          reason: `Monthly budget quota exceeded. Spend limit is PKR ${monthlyQuota.toLocaleString()}. Current spend is PKR ${monthlySpend.toLocaleString()}.`,
          monthlySpend,
          monthlyQuota,
        },
        { status: 429 }
      );
    }

    // 4. Read attachment content and build enriched message
    let attachmentContext = "";
    if (attachmentIds.length > 0) {
      const attachments = await db.chatAttachment.findMany({
        where: { id: { in: attachmentIds }, uploadedById: session.user.id },
        select: { storageKey: true, mimeType: true, fileName: true },
      });
      const contents = await Promise.all(attachments.map(readAttachmentContent));
      attachmentContext = contents.join("\n\n");
    }

    const enrichedMessage = attachmentContext
      ? `${message}\n\n---\nAttached files:\n${attachmentContext}`
      : message;

    // 5. Save user message and link attachments
    const userMessage = await db.message.create({
      data: { sessionId: currentSessionId, role: "user", content: enrichedMessage },
    });

    if (attachmentIds.length > 0) {
      await db.chatAttachment.updateMany({
        where: { id: { in: attachmentIds }, uploadedById: session.user.id },
        data: { sessionId: currentSessionId, messageId: userMessage.id },
      });
    }

    // 6. Stream AI response via Groq
    const modelInstance = groq(selectedModel);

    const responseStream = await streamText({
      model: modelInstance,
      system: "You are Hamdard Enterprise AI Platform assistant. You provide secure, compliant, and professional answers for Hamdard Pakistan employees. When files are attached, analyze their content and provide relevant insights.",
      messages: [
        ...history.map((h) => ({
          role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: h.content,
        })),
        { role: "user", content: enrichedMessage },
      ],
      onFinish: async (result) => {
        await db.message.create({
          data: { sessionId: currentSessionId, role: "assistant", content: result.text },
        });

        const inputTokens = result.usage?.inputTokens ?? Math.floor(message.length / 4);
        const outputTokens = result.usage?.outputTokens ?? Math.floor(result.text.length / 4);
        const cost = (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K;

        await db.usageLog.create({
          data: {
            employeeId: session.user.id,
            aiProvider: dbModel.provider,
            aiModel: selectedModel,
            tokensInput: inputTokens,
            tokensOutput: outputTokens,
            costUsd: cost,
            department: session.user.department || "IT",
          },
        });
      },
    });

    return responseStream.toTextStreamResponse({
      headers: { "x-session-id": currentSessionId },
    });
  } catch (error: unknown) {
    console.error("Chat Stream Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate AI stream" },
      { status: 500 }
    );
  }
}
