import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { revokeDelegation } from "@/lib/delegation";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("delegation.role.revoke");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const result = await revokeDelegation(id, guard.session.user.id);
  return NextResponse.json(result, { status: result.success ? 200 : 404 });
}
