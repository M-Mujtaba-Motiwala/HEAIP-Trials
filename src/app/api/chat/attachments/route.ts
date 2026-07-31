import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["text/plain", "text/csv", "application/pdf", "application/json", "image/png", "image/jpeg", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId");
    const file = formData.get("file");
    if (typeof sessionId !== "string" || !(file instanceof File)) return NextResponse.json({ error: "sessionId and file are required." }, { status: 400 });
    if (file.size === 0 || file.size > MAX_FILE_SIZE || !ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: "Unsupported file type or file is larger than 10 MB." }, { status: 400 });
    const chatSession = await db.chatSession.findFirst({ where: { id: sessionId, employeeId: session.user.id }, select: { id: true } });
    if (!chatSession) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    const extension = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "");
    const storageKey = `${randomUUID()}${extension}`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "chat");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, storageKey), Buffer.from(await file.arrayBuffer()));
    const attachment = await db.chatAttachment.create({ data: { sessionId, uploadedById: session.user.id, fileName: file.name, mimeType: file.type, sizeBytes: file.size, storageKey } });
    return NextResponse.json({ data: { id: attachment.id, fileName: attachment.fileName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, url: `/uploads/chat/${storageKey}` } }, { status: 201 });
  } catch (error) { console.error("[CHAT_ATTACHMENT_POST]", error); return NextResponse.json({ error: "Unable to upload file." }, { status: 500 }); }
}
