import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { delegateRole, getActiveDelegations } from "@/lib/delegation";

export async function GET() {
  const guard = await requirePermission("delegation.role.delegate");
  if ("error" in guard) return guard.error;
  return NextResponse.json({ data: await getActiveDelegations(guard.session.user.id) });
}
export async function POST(request: Request) {
  const guard = await requirePermission("delegation.role.delegate");
  if ("error" in guard) return guard.error;
  const { targetUserId, roleId, endDate } = await request.json();
  if (!targetUserId || !roleId) return NextResponse.json({ error: "targetUserId and roleId are required." }, { status: 400 });
  const parsedEndDate = endDate ? new Date(endDate) : undefined;
  if (parsedEndDate && (Number.isNaN(parsedEndDate.getTime()) || parsedEndDate <= new Date())) return NextResponse.json({ error: "endDate must be in the future." }, { status: 400 });
  const result = await delegateRole(guard.session.user.id, targetUserId, roleId, parsedEndDate);
  return NextResponse.json(result, { status: result.success ? 201 : 403 });
}
