// =============================================================================
// Chat Stream — AI chat with credential-based provider resolution
// =============================================================================
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveQuota, getMonthlySpendPKR } from "@/lib/quota";
import { enforceChatMessage, enforceModelAccess } from "@/lib/policy-enforcer";
import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { decrypt, getProviderBaseUrl } from "@/lib/crypto";

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
      include: { credential: true },
    });

    if (!dbModel) {
      return NextResponse.json({ error: `Model "${selectedModel}" is not available.` }, { status: 400 });
    }

    // Check health status
    if (dbModel.healthStatus === "DOWN") {
      return NextResponse.json({ error: `Model "${selectedModel}" is currently down.` }, { status: 503 });
    }

    // Resolve API key: credential (encrypted DB) > provider-specific env var > fallback
    const ENV_KEY_MAP: Record<string, string> = {
      openai: "OPENAI_API_KEY",
    };
    const envKey = ENV_KEY_MAP[dbModel.provider] || "";
    let apiKey = envKey ? (process.env[envKey] || "") : "";
    let baseUrl = getProviderBaseUrl(dbModel.provider);

    if (dbModel.credential) {
      try {
        apiKey = decrypt(dbModel.credential.apiKeyEncrypted);
        if (dbModel.credential.baseUrl) {
          baseUrl = dbModel.credential.baseUrl;
        }
      } catch {
        // Fall through to env var
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: `No API key configured for provider "${dbModel.provider}".` }, { status: 500 });
    }

    // Parse pricing
    let inputCostPer1K = 0;
    let outputCostPer1K = 0;
    try {
      const pricing = JSON.parse(dbModel.pricingJson);
      if (typeof pricing.inputCostPer1K === "number") inputCostPer1K = pricing.inputCostPer1K;
      if (typeof pricing.outputCostPer1K === "number") outputCostPer1K = pricing.outputCostPer1K;
    } catch { /* */ }

    // ── Policy Enforcement: Model Access ───────────────────────────────────
    const modelCheck = await enforceModelAccess(selectedModel, dbModel.provider);
    if (!modelCheck.allowed) {
      return NextResponse.json(
        {
          error: "POLICY_BLOCKED",
          reason: modelCheck.decision.blockReason || "Model access denied by policy",
          decisions: modelCheck.decision.decisions,
        },
        { status: 403 }
      );
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

    // 3. Hierarchical quota enforcement
    const user = await db.employee.findUnique({
      where: { id: session.user.id },
      select: { departmentId: true, teamId: true },
    });

    const [monthlySpend, quota] = await Promise.all([
      getMonthlySpendPKR(session.user.id),
      resolveQuota(session.user.id, user?.departmentId || undefined, user?.teamId || undefined),
    ]);

    const monthlyBudget = quota.monthlyBudgetPkr ?? 15000;
    if (monthlySpend >= monthlyBudget) {
      return NextResponse.json(
        {
          error: "QUOTA_EXCEEDED",
          reason: `Monthly budget quota exceeded. Limit: PKR ${monthlyBudget.toLocaleString()}. Current: PKR ${monthlySpend.toLocaleString()}. Source: ${quota.source}`,
          monthlySpend,
          monthlyBudget,
          quotaSource: quota.source,
        },
        { status: 429 }
      );
    }

    // Check daily budget
    if (quota.dailyBudgetPkr) {
      const { getDailySpendPKR } = await import("@/lib/quota");
      const dailySpend = await getDailySpendPKR(session.user.id);
      if (dailySpend >= quota.dailyBudgetPkr) {
        return NextResponse.json(
          { error: "DAILY_QUOTA_EXCEEDED", reason: `Daily budget exceeded. Limit: PKR ${quota.dailyBudgetPkr.toLocaleString()}.` },
          { status: 429 }
        );
      }
    }

    // Check request limits
    if (quota.monthlyRequestLimit) {
      const { getMonthlyRequestCount } = await import("@/lib/quota");
      const monthlyRequests = await getMonthlyRequestCount(session.user.id);
      if (monthlyRequests >= quota.monthlyRequestLimit) {
        return NextResponse.json(
          { error: "REQUEST_LIMIT_EXCEEDED", reason: `Monthly request limit reached. Limit: ${quota.monthlyRequestLimit}.` },
          { status: 429 }
        );
      }
    }

    // ── Policy Enforcement: Message Content ─────────────────────────────────
    const chatCheck = await enforceChatMessage(message, selectedModel, attachmentIds.length);
    if (!chatCheck.allowed) {
      return NextResponse.json(
        {
          error: "POLICY_BLOCKED",
          reason: chatCheck.decision.blockReason || "Message blocked by policy",
          decisions: chatCheck.decision.decisions,
          warnings: chatCheck.decision.warnings,
          piiFindings: chatCheck.piiFindings.length > 0 ? chatCheck.piiFindings : undefined,
          injectionFindings: chatCheck.injectionFindings.length > 0 ? chatCheck.injectionFindings : undefined,
        },
        { status: 403 }
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

    // 6. Stream AI response
    const modelInstance = createOpenAI({ baseURL: baseUrl, apiKey })(selectedModel);

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

        // Update model usage counters
        await db.aiModel.update({
          where: { id: dbModel.id },
          data: {
            totalRequests: { increment: 1 },
            totalCostUsd: { increment: cost },
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
