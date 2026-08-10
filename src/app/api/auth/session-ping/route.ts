import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionToken } = await req.json();
    if (!sessionToken) {
      return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
    }

    // 1. Upsert active session
    await db.activeSession.upsert({
      where: { sessionToken },
      update: { lastActiveAt: new Date() },
      create: {
        employeeId: session.user.id,
        sessionToken,
        lastActiveAt: new Date(),
      }
    });

    // 2. Cleanup stale sessions (older than 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await db.activeSession.deleteMany({
      where: { lastActiveAt: { lt: fifteenMinutesAgo } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session ping error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
