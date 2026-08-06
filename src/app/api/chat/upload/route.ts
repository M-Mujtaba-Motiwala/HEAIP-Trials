// =============================================================================
// File Upload API — chat attachment upload -> local /uploads or cloud storage
// =============================================================================
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { enforceFileUpload } from "@/lib/policy-enforcer";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "chat");
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!sessionId) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed." }, { status: 415 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 10 MB limit." }, { status: 413 });
    }

    // ── Policy Enforcement: File Upload ──────────────────────────────────
    const policyResult = await enforceFileUpload(file.name, file.type, file.size, sessionId);
    if (!policyResult.allowed) {
      return NextResponse.json({
        error: "POLICY_BLOCKED",
        reason: policyResult.decision.blockReason || "File upload blocked by policy",
        decisions: policyResult.decision.decisions,
        warnings: policyResult.decision.warnings,
      }, { status: 403 });
    }

    // Ensure session exists and belongs to user
    const chatSession = await db.chatSession.findFirst({
      where: { id: sessionId, employee: { id: session.user.id } },
    });
    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    const storageKey = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploadPath = join(UPLOAD_DIR, storageKey);
    await mkdir(UPLOAD_DIR, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(uploadPath, Buffer.from(bytes));

    const attachment = await db.chatAttachment.create({
      data: {
        sessionId,
        uploadedById: session.user.id,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey,
      },
    });

    return NextResponse.json({
      data: {
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        url: `/uploads/chat/${storageKey}`,
        classification: policyResult.classification,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[CHAT_UPLOAD_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
