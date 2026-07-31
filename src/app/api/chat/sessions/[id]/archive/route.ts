import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const existing = await db.chatSession.findFirst({
    where: { id: sessionId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // RBAC check
  if (existing.employeeId !== session.user.id && session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const shouldArchive = body.isArchived !== undefined ? Boolean(body.isArchived) : !existing.isArchived;

    const updated = await db.chatSession.update({
      where: { id: sessionId },
      data: { isArchived: shouldArchive },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: shouldArchive ? "CHAT_SESSION_ARCHIVE" : "CHAT_SESSION_UNARCHIVE",
        resource: `ChatSession:${sessionId}`,
        details: JSON.stringify({ isArchived: shouldArchive }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Archive session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
