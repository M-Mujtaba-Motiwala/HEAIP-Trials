import { auth } from "@/lib/auth";
import { getMonthlyQuotaPKR, getMonthlySpendPKR } from "@/lib/quota";
import { enforceChatMessage } from "@/lib/policy-enforcer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, files } = await req.json();

    // ── Policy Enforcement: Full chat message check ─────────────────────
    const chatCheck = await enforceChatMessage(
      message || "",
      "unknown",
      files?.length || 0
    );

    if (!chatCheck.allowed) {
      return NextResponse.json({
        compliant: false,
        reason: chatCheck.decision.blockReason || "Request blocked by policy",
        category: chatCheck.decision.decisions[0]?.category || "POLICY_VIOLATION",
        decisions: chatCheck.decision.decisions,
        piiFindings: chatCheck.piiFindings.length > 0 ? chatCheck.piiFindings : undefined,
        injectionFindings: chatCheck.injectionFindings.length > 0 ? chatCheck.injectionFindings : undefined,
      });
    }

    // Quota check
    const totalSpend = await getMonthlySpendPKR(session.user.id);
    const quotaLimit = await getMonthlyQuotaPKR();

    if (totalSpend >= quotaLimit) {
      return NextResponse.json({
        compliant: false,
        reason: `Monthly budget quota exceeded. Spend limit is PKR ${quotaLimit.toLocaleString()}. Current spend is PKR ${totalSpend.toLocaleString()}.`,
        category: "QUOTA_EXCEEDED",
      });
    }

    return NextResponse.json({
      compliant: true,
      currentSpend: totalSpend,
      quotaRemaining: Math.max(0, quotaLimit - totalSpend),
      policyDecisions: chatCheck.decision.decisions.length > 0 ? chatCheck.decision.decisions : undefined,
      warnings: chatCheck.decision.warnings.length > 0 ? chatCheck.decision.warnings : undefined,
    });

  } catch (error: unknown) {
    console.error("Compliance check error:", error);
    return NextResponse.json({ error: "Internal compliance check failed" }, { status: 500 });
  }
}
