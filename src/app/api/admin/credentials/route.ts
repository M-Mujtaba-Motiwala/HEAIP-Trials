// =============================================================================
// API Credentials Management — CRUD + Test Connection
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";
import { encrypt, maskKey } from "@/lib/crypto";

export async function GET() {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;

  try {
    const credentials = await db.apiCredential.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { models: true } },
      },
    });

    // Never expose encrypted keys — return alias only
    const data = credentials.map(c => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      apiKeyAlias: c.apiKeyAlias,
      baseUrl: c.baseUrl,
      authType: c.authType,
      organizationId: c.organizationId,
      projectId: c.projectId,
      region: c.region,
      apiVersion: c.apiVersion,
      status: c.status,
      lastTestedAt: c.lastTestedAt,
      lastTestResult: c.lastTestResult,
      lastRotatedAt: c.lastRotatedAt,
      expiresAt: c.expiresAt,
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      modelCount: c._count.models,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[CREDENTIALS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const { name, provider, apiKey, baseUrl, authType, organizationId, projectId, region, apiVersion, customHeaders, notes, expiresAt } = body;

    if (!name || !provider || !apiKey) {
      return NextResponse.json({ error: "Name, provider, and API key are required." }, { status: 400 });
    }

    const encrypted = encrypt(apiKey);
    const alias = maskKey(apiKey);

    const credential = await db.apiCredential.create({
      data: {
        name,
        provider,
        apiKeyEncrypted: encrypted,
        apiKeyAlias: alias,
        baseUrl: baseUrl || null,
        authType: authType || "api_key",
        organizationId: organizationId || null,
        projectId: projectId || null,
        region: region || null,
        apiVersion: apiVersion || null,
        customHeaders: typeof customHeaders === "string" ? customHeaders : JSON.stringify(customHeaders || {}),
        notes: notes || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "CREATE_API_CREDENTIAL",
        resource: `apiCredential:${credential.id}`,
        details: JSON.stringify({ name, provider, alias }),
      },
    });

    return NextResponse.json({ data: { ...credential, apiKeyAlias: alias } }, { status: 201 });
  } catch (error) {
    console.error("[CREDENTIALS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
