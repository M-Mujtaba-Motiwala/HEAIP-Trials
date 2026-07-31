import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper for RBAC check: user owns session or is SUPER_ADMIN / ADMIN
async function canManageSession(sessionId: string, userId: string, userRole: string) {
  if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true;
  const existing = await db.chatSession.findFirst({
    where: { id: sessionId, employeeId: userId },
  });
  return !!existing;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const hasAccess = await canManageSession(sessionId, session.user.id, session.user.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const { title } = await req.json();
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const updated = await db.chatSession.update({
      where: { id: sessionId },
      data: { title: title.trim() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CHAT_SESSION_RENAME",
        resource: `ChatSession:${sessionId}`,
        details: JSON.stringify({ newTitle: title.trim() }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Rename session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const hasAccess = await canManageSession(sessionId, session.user.id, session.user.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    await db.chatSession.delete({
      where: { id: sessionId },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CHAT_SESSION_DELETE",
        resource: `ChatSession:${sessionId}`,
        details: JSON.stringify({ deletedSessionId: sessionId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
