// =============================================================================
// Chat Models — Available models for the chat interface
// =============================================================================
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  if (!(await auth())?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const models = await db.aiModel.findMany({
    where: { enabled: true },
    select: {
      provider: true,
      modelId: true,
      displayName: true,
      isDefault: true,
      category: true,
      description: true,
      capabilitiesJson: true,
      healthStatus: true,
      credential: {
        select: { apiKeyAlias: true, status: true },
      },
    },
    orderBy: [{ isDefault: "desc" }, { displayName: "asc" }],
  });

  const data = models
    .filter(m => {
      // Hide models with inactive credentials
      if (m.credential && m.credential.status !== "ACTIVE") return false;
      // Hide models that are down
      if (m.healthStatus === "DOWN") return false;
      return true;
    })
    .map(m => {
      let capabilities: Record<string, boolean> = {};
      try { capabilities = JSON.parse(m.capabilitiesJson); } catch { /* */ }

      return {
        id: m.modelId,
        label: m.displayName,
        provider: m.provider,
        category: m.category,
        description: m.description,
        isDefault: m.isDefault,
        capabilities,
        healthStatus: m.healthStatus,
        hasCredential: !!m.credential,
      };
    });

  return NextResponse.json({ data });
}
