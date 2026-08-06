// =============================================================================
// Test API Credential Connection
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";
import { decrypt, getProviderBaseUrl } from "@/lib/crypto";

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/models",
  anthropic: "https://api.anthropic.com/v1/messages",
  google: "https://generativelanguage.googleapis.com/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
  together: "https://api.together.xyz/v1/models",
  huggingface: "https://huggingface.co/api/models",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const credential = await db.apiCredential.findUnique({ where: { id } });
    if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

    const apiKey = decrypt(credential.apiKeyEncrypted);
    const baseUrl = credential.baseUrl || PROVIDER_ENDPOINTS[credential.provider] || "";

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

      if (credential.provider === "anthropic") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      }

      if (credential.organizationId) {
        headers["OpenAI-Organization"] = credential.organizationId;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(baseUrl, {
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
        modelId: id, // Using credential ID as modelId for credential-only checks
        credentialId: id,
        status,
        latencyMs,
        error: error || null,
        details: JSON.stringify({ baseUrl, provider: credential.provider }),
      },
    }).catch(() => {});

    // Update credential status
    await db.apiCredential.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: status,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "TEST_API_CREDENTIAL",
        resource: `apiCredential:${id}`,
        details: JSON.stringify({ status, latencyMs, error }),
      },
    });

    return NextResponse.json({
      data: {
        status,
        latencyMs,
        error: error || null,
        testedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[CREDENTIAL_TEST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
