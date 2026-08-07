import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAnyPermission } from "@/lib/permissions";
import { enforceWorkflowAction } from "@/lib/policy-enforcer";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasAnyPermission(session.user.id, [
    "admin.dashboard.view",
    "workflows.manage",
    "workflows.read",
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const workflows = await db.workflow.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: workflows });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load workflows" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasAnyPermission(session.user.id, [
    "workflows.manage",
    "workflows.create",
    "workflows.update",
    "workflows.delete"
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // ── Policy Enforcement: Workflow Action ───────────────────────────────
    const action = body.action === "delete" ? "DELETE" : body.action === "edit" ? "EDIT" : "CREATE";
    const workflowName = body.name || body.workflow?.name || "";

    const policyCheck = await enforceWorkflowAction(action, workflowName);
    if (!policyCheck.allowed) {
      return NextResponse.json({
        error: "POLICY_BLOCKED",
        reason: policyCheck.decision.blockReason || "Workflow operation blocked by policy",
        decisions: policyCheck.decision.decisions,
      }, { status: 403 });
    }

    if (body.action === "delete") {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Workflow name is required for deletion" }, { status: 400 });
      }
      await db.workflow.delete({ where: { name: body.name } });
    } else if (body.action === "edit") {
      if (typeof body.oldName !== "string" || !body.workflow) {
        return NextResponse.json({ error: "oldName and workflow are required for editing" }, { status: 400 });
      }
      await db.workflow.update({
        where: { name: body.oldName },
        data: {
          name: body.workflow.name,
          agents: body.workflow.agents,
          status: body.workflow.status,
          description: body.workflow.description,
        },
      });
    } else {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Workflow name is required" }, { status: 400 });
      }
      await db.workflow.create({
        data: {
          name: body.name.trim(),
          agents: body.agents || 1,
          status: body.status || "Draft",
          description: body.description || "",
        },
      });
    }

    const workflows = await db.workflow.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: workflows });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save workflow" }, { status: 500 });
  }
}
