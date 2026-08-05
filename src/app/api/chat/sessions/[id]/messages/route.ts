import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: sessionId } = await params;

    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    // RBAC: the REQUESTER must own the session OR be a SUPER_ADMIN/ADMIN.
    // Previous implementation checked the session *owner's* role, which let any
    // signed-in user read any session belonging to an administrator.
    const chatSession = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { employeeId: true },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const requesterRole = session.user.role || "";
    const isOwner = chatSession.employeeId === session.user.id;
    const isAdmin = requesterRole === "SUPER_ADMIN" || requesterRole === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const messages = await db.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        tokensUsed: true,
        costUsd: true,
        createdAt: true,
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            storageKey: true,
          },
        },
      },
    });

    return NextResponse.json({ data: messages });
  } catch (error: unknown) {
    console.error("Load messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}