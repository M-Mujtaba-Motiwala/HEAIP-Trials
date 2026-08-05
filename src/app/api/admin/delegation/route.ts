// =============================================================================
// Delegation API — List, Create, Revoke delegated role assignments
// =============================================================================
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { delegateRole, revokeDelegation, getActiveDelegations } from "@/lib/delegation";

export async function GET() {
  const guard = await requirePermission("delegation.role.delegate");
  if ("error" in guard) return guard.error;
  try {
    const delegations = await getActiveDelegations(guard.session.user.id);
    return NextResponse.json({ data: delegations });
  } catch (error) {
    console.error("[DELEGATION_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requirePermission("delegation.role.delegate");
  if ("error" in guard) return guard.error;
  try {
    const { targetUserId, roleId, endDate } = await req.json();
    if (!targetUserId || !roleId) {
      return NextResponse.json({ error: "targetUserId and roleId are required." }, { status: 400 });
    }
    const result = await delegateRole(
      guard.session.user.id,
      targetUserId,
      roleId,
      endDate ? new Date(endDate) : undefined
    );
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }
    return NextResponse.json({ data: { assignmentId: result.assignmentId, message: result.message } }, { status: 201 });
  } catch (error) {
    console.error("[DELEGATION_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const guard = await requirePermission("delegation.role.revoke");
  if ("error" in guard) return guard.error;
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId query param is required." }, { status: 400 });
    }
    const result = await revokeDelegation(assignmentId, guard.session.user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }
    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error("[DELEGATION_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
