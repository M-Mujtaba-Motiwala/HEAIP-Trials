import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAnyPermission } from "@/lib/permissions";

export const maxDuration = 60;

const PROVIDERS = ["google", "openai", "anthropic"] as const;
const SIZES = ["1024x1024", "1024x1792", "1792x1024"] as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPlaceholderSvg(prompt: string, width: number, height: number): string {
  const seed = Array.from(prompt).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue = seed % 360;
  const words = prompt.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > 28) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);

  const fontSize = Math.min(28, Math.floor(width / 24));
  const lineHeight = fontSize + 10;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  const textLines = lines
    .map(
      (l, i) =>
        `<text x="${width / 2}" y="${startY + i * lineHeight}" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" fill="#ffffff" text-anchor="middle" font-weight="600">${escapeXml(l)}</text>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue}, 65%, 22%)"/>
      <stop offset="50%" stop-color="hsl(${(hue + 40) % 360}, 70%, 35%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 90) % 360}, 65%, 20%)"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="22%" cy="18%" r="${Math.floor(width / 6)}" fill="rgba(255,255,255,0.08)"/>
  <circle cx="78%" cy="82%" r="${Math.floor(width / 5)}" fill="rgba(255,255,255,0.06)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <text x="${width / 2}" y="${height / 2 - fontSize * 2}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.floor(fontSize * 0.8)}" fill="#ffffffcc" text-anchor="middle" letter-spacing="3">HAMDARD AI</text>
  ${textLines}
</svg>`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await hasAnyPermission(session.user.id, ["chat.image.generate", "chat.session.create"]))) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to generate images" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { prompt?: string; sessionId?: string; size?: string; provider?: string };
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    const width = SIZES.includes(body.size as (typeof SIZES)[number]) && body.size === "1024x1792" ? 1024 : body.size === "1792x1024" ? 1792 : 1024;
    const height = body.size === "1024x1792" ? 1792 : body.size === "1792x1024" ? 1024 : 1024;

    // Resolve session (create one if the image is generated before the first chat message).
    let currentSessionId = body.sessionId ?? "";
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
          title: `Image: ${prompt.slice(0, 55)}`,
          aiProvider: "groq",
          aiModel: "llama-3.3-70b-versatile",
        },
      });
      currentSessionId = created.id;
    }

    const svg = buildPlaceholderSvg(prompt, width, height);
    const storageKey = `gen-${randomUUID()}.svg`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "chat");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, storageKey), svg, "utf8");

    const assistantMessage = await db.message.create({
      data: {
        sessionId: currentSessionId,
        role: "assistant",
        content: `Generated image: ${prompt}`,
      },
    });

    await db.chatAttachment.create({
      data: {
        sessionId: currentSessionId,
        uploadedById: session.user.id,
        fileName: `${prompt.slice(0, 40).replace(/[^a-zA-Z0-9-_ ]/g, "") || "generated"}.svg`,
        mimeType: "image/svg+xml",
        sizeBytes: Buffer.byteLength(svg),
        storageKey,
        messageId: assistantMessage.id,
      },
    });

    return NextResponse.json({ data: { messageId: assistantMessage.id, imageUrl: `/uploads/chat/${storageKey}`, sessionId: currentSessionId } }, { status: 201 });
  } catch (error) {
    console.error("[CHAT_IMAGE_POST]", error);
    return NextResponse.json({ error: "Unable to generate image." }, { status: 500 });
  }
}
