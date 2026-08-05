import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAnyPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

interface AgentRecord {
  name: string;
  model: string;
  temp?: number;
  status?: string;
  systemPrompt?: string;
}

function readAgents(value: string | null): AgentRecord[] {
  try {
    return (value ? JSON.parse(value) : []) as AgentRecord[];
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
    "agents.manage",
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: "admin_agents" }
    });

    let agents: AgentRecord[] = [
      { name: 'Report Generator', model: 'llama-3.3-70b-versatile', temp: 0.7, status: 'Active' },
      { name: 'Data Analyst', model: 'llama-3.3-70b-versatile', temp: 0.5, status: 'Active' },
      { name: 'HR Assistant', model: 'llama-3.1-8b-instant', temp: 0.3, status: 'Draft' },
    ];

    if (setting) {
      agents = readAgents(setting.value);
    } else {
      await db.systemSetting.create({
        data: {
          category: "AI",
          key: "admin_agents",
          value: JSON.stringify(agents)
        }
      });
    }

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
    "admin.dashboard.view",
    "settings.update",
    "agents.manage",
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const setting = await db.systemSetting.findUnique({
      where: { key: "admin_agents" }
    });

    let agents: AgentRecord[] = readAgents(setting?.value ?? null);

    if (body.action === "delete") {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Agent name is required for deletion" }, { status: 400 });
      }
      agents = agents.filter((a: AgentRecord) => a.name !== body.name);
    } else if (body.action === "edit") {
      if (typeof body.oldName !== "string" || !body.agent) {
        return NextResponse.json({ error: "oldName and agent are required for editing" }, { status: 400 });
      }
      agents = agents.map((a: AgentRecord) => a.name === body.oldName ? { ...a, ...(body.agent as Partial<AgentRecord>) } : a);
    } else {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
      }
      agents.push(body as AgentRecord);
    }

    if (setting) {
      await db.systemSetting.update({
        where: { key: "admin_agents" },
        data: { value: JSON.stringify(agents) }
      });
    } else {
      await db.systemSetting.create({
        data: {
          category: "AI",
          key: "admin_agents",
          value: JSON.stringify(agents)
        }
      });
    }

    return NextResponse.json({ success: true, data: agents });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save agent" }, { status: 500 });
  }
}
