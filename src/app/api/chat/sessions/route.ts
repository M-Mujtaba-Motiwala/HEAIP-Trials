import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await db.chatSession.findMany({
      where: { employeeId: session.user.id, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, title: true, isArchived: true, updatedAt: true },
    });

    return NextResponse.json({
      data: sessions.map((chatSession) => ({
        ...chatSession,
        updatedAt: chatSession.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const ALLOWED_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "mixtral-8x7b-32768",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "New Chat";
  const model = typeof body.model === "string" ? body.model : "llama-3.3-70b-versatile";

  if (title.length > 200) {
    return NextResponse.json({ error: "Title must be 200 characters or fewer" }, { status: 400 });
  }

  if (!ALLOWED_MODELS.includes(model)) {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }

  try {
    const newSession = await db.chatSession.create({
      data: {
        employeeId: session.user.id,
        title: title || "New Chat",
        aiModel: model,
      },
    });

    return NextResponse.json({ data: newSession });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
