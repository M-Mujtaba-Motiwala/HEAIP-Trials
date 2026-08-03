// =============================================================================
// GET /api/chat/sessions/archived
// Returns all archived chat sessions for the authenticated user.
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await db.chatSession.findMany({
    where: { employeeId: session.user.id, isArchived: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json({
    data: sessions.map((s) => ({
      ...s,
      updatedAt: s.updatedAt.toISOString(),
    })),
    count: sessions.length,
  });
}
