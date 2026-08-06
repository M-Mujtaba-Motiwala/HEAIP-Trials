// =============================================================================
// Single API Credential — PATCH, DELETE, Test Connection, Rotate Key
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";
import { encrypt, maskKey } from "@/lib/crypto";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const credential = await db.apiCredential.findUnique({
      where: { id },
      include: {
        models: { select: { id: true, displayName: true, provider: true, modelId: true } },
        _count: { select: { models: true, healthChecks: true } },
      },
    });

    if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

    // Never expose encrypted key
    return NextResponse.json({
      data: {
        ...credential,
        apiKeyEncrypted: undefined,
        models: credential.models,
      },
    });
  } catch (error) {
    console.error("[CREDENTIAL_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const existing = await db.apiCredential.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

    const body = await req.json();
    const { name, provider, apiKey, baseUrl, authType, organizationId, projectId, region, apiVersion, customHeaders, status, notes, expiresAt } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (provider !== undefined) updateData.provider = provider;
    if (apiKey !== undefined) {
      updateData.apiKeyEncrypted = encrypt(apiKey);
      updateData.apiKeyAlias = maskKey(apiKey);
    }
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (authType !== undefined) updateData.authType = authType;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (region !== undefined) updateData.region = region;
    if (apiVersion !== undefined) updateData.apiVersion = apiVersion;
    if (customHeaders !== undefined) updateData.customHeaders = typeof customHeaders === "string" ? customHeaders : JSON.stringify(customHeaders);
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const credential = await db.apiCredential.update({ where: { id }, data: updateData });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "UPDATE_API_CREDENTIAL",
        resource: `apiCredential:${id}`,
        details: JSON.stringify({ ...body, apiKey: apiKey ? "[REDACTED]" : undefined }),
      },
    });

    const { apiKeyEncrypted: _, ...safeCredential } = credential as Record<string, unknown>;
    return NextResponse.json({ data: safeCredential });
  } catch (error) {
    console.error("[CREDENTIAL_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const existing = await db.apiCredential.findUnique({
      where: { id },
      include: { _count: { select: { models: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

    const modelCount = existing._count.models;
    if (modelCount > 0) {
      return NextResponse.json({ error: `Cannot delete credential used by ${modelCount} model(s). Unlink models first.` }, { status: 400 });
    }

    await db.modelHealthCheck.deleteMany({ where: { credentialId: id } });
    await db.apiCredential.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "DELETE_API_CREDENTIAL",
        resource: `apiCredential:${id}`,
        details: JSON.stringify({ name: existing.name, provider: existing.provider }),
      },
    });

    return NextResponse.json({ message: "Credential deleted." });
  } catch (error) {
    console.error("[CREDENTIAL_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
