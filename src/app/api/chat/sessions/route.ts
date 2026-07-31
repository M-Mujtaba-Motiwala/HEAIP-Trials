import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await db.chatSession.findMany({
    where: { employeeId: session.user.id, isArchived: false },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json({
    data: sessions.map((chatSession) => ({
      ...chatSession,
      updatedAt: chatSession.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, model } = await req.json();
    const newSession = await db.chatSession.create({
      data: {
        employeeId: session.user.id,
        title: title || "New Chat",
        aiModel: model || "gemini-2.0-flash",
      },
    });

    return NextResponse.json({ data: newSession });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
