import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

function checkCsrf(req: NextRequest): NextResponse | null {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 415 });
  }
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

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
  const csrfErr = checkCsrf(req);
  if (csrfErr) return csrfErr;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  if (!isValidUUID(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }
  const hasAccess = await canManageSession(sessionId, session.user.id, session.user.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { title, isArchived } = body;

    const data: Record<string, unknown> = {};
    const actions: string[] = [];
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "Title must be a non-empty string" }, { status: 400 });
      }
      if (title.trim().length > 200) {
        return NextResponse.json({ error: "Title must be 200 characters or fewer" }, { status: 400 });
      }
      data.title = title.trim();
      actions.push("RENAME");
    }
    if (isArchived !== undefined) {
      data.isArchived = Boolean(isArchived);
      actions.push("ARCHIVE");
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.chatSession.update({
      where: { id: sessionId },
      data,
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: `CHAT_SESSION_${actions.join("_")}`,
        resource: `ChatSession:${sessionId}`,
        details: JSON.stringify(data),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update session error:", error);
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
  if (!isValidUUID(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }
  const hasAccess = await canManageSession(sessionId, session.user.id, session.user.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
  }

  try {
    const existing = await db.chatSession.findUnique({ where: { id: sessionId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

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
