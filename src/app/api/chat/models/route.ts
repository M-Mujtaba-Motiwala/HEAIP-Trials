import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  if (!(await auth())?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await db.aiModel.findMany({ where: { enabled: true }, select: { provider: true, modelId: true, displayName: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { displayName: "asc" }] }) });
}
