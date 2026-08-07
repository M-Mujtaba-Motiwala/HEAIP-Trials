import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAnyPermission } from "@/lib/permissions";
import { enforceAgentAction } from "@/lib/policy-enforcer";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasAnyPermission(session.user.id, [
    "admin.dashboard.view",
    "agents.manage",
    "agents.read",
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const agents = await db.agent.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: agents });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasAnyPermission(session.user.id, [
    "agents.manage",
    "agents.create",
    "agents.update",
    "agents.delete"
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // ── Policy Enforcement: Agent Action ──────────────────────────────────
    const action = body.action === "delete" ? "DELETE" : body.action === "edit" ? "EDIT" : "CREATE";
    const agentName = body.name || body.agent?.name || "";
    const agentModel = body.model || body.agent?.model;

    const policyCheck = await enforceAgentAction(action, agentName, agentModel);
    if (!policyCheck.allowed) {
      return NextResponse.json({
        error: "POLICY_BLOCKED",
        reason: policyCheck.decision.blockReason || "Agent operation blocked by policy",
        decisions: policyCheck.decision.decisions,
      }, { status: 403 });
    }

    if (body.action === "delete") {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Agent name is required for deletion" }, { status: 400 });
      }
      await db.agent.delete({ where: { name: body.name } });
    } else if (body.action === "edit") {
      if (typeof body.oldName !== "string" || !body.agent) {
        return NextResponse.json({ error: "oldName and agent are required for editing" }, { status: 400 });
      }
      await db.agent.update({
        where: { name: body.oldName },
        data: {
          name: body.agent.name,
          model: body.agent.model,
          temp: body.agent.temp,
          systemPrompt: body.agent.systemPrompt,
          status: body.agent.status,
        },
      });
    } else {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
      }
      await db.agent.create({
        data: {
          name: body.name.trim(),
          model: body.model || "gemini-2.5-pro",
          temp: body.temp ?? 0.7,
          systemPrompt: body.systemPrompt || "",
          status: body.status || "Active",
        },
      });
    }

    const agents = await db.agent.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: agents });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save agent" }, { status: 500 });
  }
}
