// =============================================================================
// Model Health Check — Test model connectivity
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";
import { decrypt, getProviderBaseUrl } from "@/lib/crypto";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const model = await db.aiModel.findUnique({
      where: { id },
      include: { credential: true },
    });
    if (!model) return NextResponse.json({ error: "Model not found." }, { status: 404 });

    // Need a credential to test
    if (!model.credential) {
      return NextResponse.json({ error: "No API credential linked to this model. Link a credential first." }, { status: 400 });
    }

    const apiKey = decrypt(model.credential.apiKeyEncrypted);
    const baseUrl = getProviderBaseUrl(model.provider, model.credential.baseUrl);

    if (!baseUrl) {
      return NextResponse.json({ error: "No endpoint URL configured for this provider." }, { status: 400 });
    }

    const startTime = Date.now();
    let status = "HEALTHY";
    let error = "";
    let latencyMs = 0;

    try {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      if (model.provider === "anthropic") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      }

      if (model.credential.organizationId) {
        headers["OpenAI-Organization"] = model.credential.organizationId;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      // Try to list models or send a minimal request
      const testUrl = model.provider === "anthropic"
        ? `${baseUrl}/messages`
        : `${baseUrl}/models`;

      const response = await fetch(testUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      latencyMs = Date.now() - startTime;

      if (!response.ok) {
        status = "DEGRADED";
        error = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (err) {
      latencyMs = Date.now() - startTime;
      status = "DOWN";
      error = err instanceof Error ? err.message : "Connection failed";
    }

    // Log health check
    await db.modelHealthCheck.create({
      data: {
        modelId: id,
        credentialId: model.credentialId,
        status,
        latencyMs,
        error: error || null,
        details: JSON.stringify({ provider: model.provider, modelId: model.modelId }),
      },
    });

    // Update model health status
    await db.aiModel.update({
      where: { id },
      data: {
        healthStatus: status,
        lastHealthCheck: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "TEST_AI_MODEL",
        resource: `aiModel:${id}`,
        details: JSON.stringify({ status, latencyMs, error }),
      },
    });

    return NextResponse.json({
      data: { status, latencyMs, error: error || null, testedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error("[MODEL_HEALTH_CHECK]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
