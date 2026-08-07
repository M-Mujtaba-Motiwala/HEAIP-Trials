import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAnyPermission } from "@/lib/permissions";
import { parseVideoEditInstruction } from "@/lib/video-parser";
import { processVideo } from "@/lib/video-editor";

export const maxDuration = 60;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await hasAnyPermission(session.user.id, ["chat.video.edit", "chat.session.create"]))) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to edit videos" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const instruction = (formData.get("instruction") as string | null)?.trim() ?? "";
    const sessionId = formData.get("sessionId");
    const file = formData.get("file");

    if (!instruction) return NextResponse.json({ error: "Edit instruction is required." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "A video file is required." }, { status: 400 });
    if (file.size === 0 || file.size > MAX_FILE_SIZE || !ALLOWED_VIDEO_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported video type or file is larger than 50 MB." }, { status: 400 });
    }

    let currentSessionId = typeof sessionId === "string" ? sessionId : "";
    if (currentSessionId) {
      const existing = await db.chatSession.findUnique({ where: { id: currentSessionId }, select: { employeeId: true } });
      const role = session.user.role || "";
      const isOwner = existing?.employeeId === session.user.id;
      const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
      if (!existing || (!isOwner && !isAdmin)) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }
    } else {
      const created = await db.chatSession.create({
        data: {
          employeeId: session.user.id,
          title: `Video: ${instruction.slice(0, 55)}`,
          aiProvider: "groq",
          aiModel: "llama-3.3-70b-versatile",
        },
      });
      currentSessionId = created.id;
    }

    const extension = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "");
    const tempStorageKey = `temp-${randomUUID()}${extension}`;
    const finalStorageKey = `edited-${randomUUID()}${extension}`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "chat");
    
    await mkdir(uploadDirectory, { recursive: true });
    
    const tempFilePath = path.join(uploadDirectory, tempStorageKey);
    const finalFilePath = path.join(uploadDirectory, finalStorageKey);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, buffer);

    let finalVideoUrl = "";
    let finalSizeBytes = file.size;

    try {
      const plan = await parseVideoEditInstruction(instruction);
      
      if (!plan.operations || plan.operations.length === 0) {
        await writeFile(finalFilePath, buffer);
      } else {
        await processVideo(tempFilePath, finalFilePath, plan);
      }
      
      finalVideoUrl = `/uploads/chat/${finalStorageKey}`;
      const fileStats = await stat(finalFilePath);
      finalSizeBytes = fileStats.size;
    } catch (err) {
      console.error("[VIDEO EDIT ERROR]", err);
      finalVideoUrl = `/uploads/chat/${tempStorageKey}`; // Fallback
    } finally {
      if (finalVideoUrl !== `/uploads/chat/${tempStorageKey}`) {
         try { await unlink(tempFilePath); } catch (e) {}
      }
    }

    const assistantMessage = await db.message.create({
      data: {
        sessionId: currentSessionId,
        role: "assistant",
        content: `Video edit completed for: "${instruction}".`,
      },
    });

    await db.chatAttachment.create({
      data: {
        sessionId: currentSessionId,
        uploadedById: session.user.id,
        fileName: `edited-${file.name}`,
        mimeType: file.type,
        sizeBytes: finalSizeBytes,
        storageKey: finalVideoUrl.replace("/uploads/chat/", ""),
        messageId: assistantMessage.id,
      },
    });

    return NextResponse.json({ data: { messageId: assistantMessage.id, videoUrl: finalVideoUrl, sessionId: currentSessionId } }, { status: 201 });
  } catch (error) {
    console.error("[CHAT_VIDEO_POST]", error);
    return NextResponse.json({ error: "Unable to process video." }, { status: 500 });
  }
}
