import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAnyPermission } from "@/lib/permissions";

export const maxDuration = 60;

const SIZES = ["1024x1024", "1024x1792", "1792x1024"] as const;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await hasAnyPermission(session.user.id, ["chat.image.generate", "chat.session.create"]))) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to generate images" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { prompt?: string; sessionId?: string; size?: string };
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    const size = SIZES.includes(body.size as (typeof SIZES)[number]) ? body.size : "1024x1024";

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
          aiProvider: "openai",
          aiModel: "gpt-image-1",
        },
      });
      currentSessionId = created.id;
    }

    // Call OpenAI DALL-E 3 API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API Key not configured." }, { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: size,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "OpenAI API returned an error");
    }

    const json = await response.json();
    const b64Data = json.data[0].b64_json;
    const imageBuffer = Buffer.from(b64Data, "base64");

    const storageKey = `gen-${randomUUID()}.png`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "chat");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, storageKey), imageBuffer);

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
        fileName: `${prompt.slice(0, 40).replace(/[^a-zA-Z0-9-_ ]/g, "") || "generated"}.png`,
        mimeType: "image/png",
        sizeBytes: imageBuffer.length,
        storageKey,
        messageId: assistantMessage.id,
      },
    });

    return NextResponse.json({ data: { messageId: assistantMessage.id, imageUrl: `/uploads/chat/${storageKey}`, sessionId: currentSessionId } }, { status: 201 });
  } catch (error) {
    console.error("[CHAT_IMAGE_POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate image." }, { status: 500 });
  }
}
