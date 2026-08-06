import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAnyPermission } from "@/lib/permissions";
import { enforceWorkflowAction } from "@/lib/policy-enforcer";
import { NextRequest, NextResponse } from "next/server";

interface WorkflowRecord {
  name: string;
  agents?: number;
  status?: string;
  description?: string;
}

function readWorkflows(value: string | null): WorkflowRecord[] {
  try {
    return (value ? JSON.parse(value) : []) as WorkflowRecord[];
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasAnyPermission(session.user.id, [
    "admin.dashboard.view",
    "settings.update",
    "workflows.manage",
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: "admin_workflows" }
    });

    let workflows: WorkflowRecord[] = [
      { name: 'Report Generation Pipeline', agents: 3, status: 'Active' },
      { name: 'Customer Analysis Flow', agents: 2, status: 'Testing' },
      { name: 'Data Validation Chain', agents: 4, status: 'Draft' },
    ];

    if (setting) {
      workflows = readWorkflows(setting.value);
    } else {
      await db.systemSetting.create({
        data: {
          category: "SYSTEM",
          key: "admin_workflows",
          value: JSON.stringify(workflows)
        }
      });
    }

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
    "admin.dashboard.view",
    "settings.update",
    "workflows.manage",
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

    const setting = await db.systemSetting.findUnique({
      where: { key: "admin_workflows" }
    });

    let workflows: WorkflowRecord[] = readWorkflows(setting?.value ?? null);

    if (body.action === "delete") {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Workflow name is required for deletion" }, { status: 400 });
      }
      workflows = workflows.filter((w: WorkflowRecord) => w.name !== body.name);
    } else if (body.action === "edit") {
      if (typeof body.oldName !== "string" || !body.workflow) {
        return NextResponse.json({ error: "oldName and workflow are required for editing" }, { status: 400 });
      }
      workflows = workflows.map((w: WorkflowRecord) => w.name === body.oldName ? { ...w, ...(body.workflow as Partial<WorkflowRecord>) } : w);
    } else {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Workflow name is required" }, { status: 400 });
      }
      workflows.push(body as WorkflowRecord);
    }

    if (setting) {
      await db.systemSetting.update({
        where: { key: "admin_workflows" },
        data: { value: JSON.stringify(workflows) }
      });
    } else {
      await db.systemSetting.create({
        data: {
          category: "SYSTEM",
          key: "admin_workflows",
          value: JSON.stringify(workflows)
        }
      });
    }

    return NextResponse.json({ success: true, data: workflows });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save workflow" }, { status: 500 });
  }
}
