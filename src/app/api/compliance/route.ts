import { auth } from "@/lib/auth";
import { getMonthlyQuotaPKR, getMonthlySpendPKR } from "@/lib/quota";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, files } = await req.json();

    // 1. Quota Limit Check
    const totalSpend = await getMonthlySpendPKR(session.user.id);
    const quotaLimit = await getMonthlyQuotaPKR();

    if (totalSpend >= quotaLimit) {
      return NextResponse.json({
        compliant: false,
        reason: `Monthly budget quota exceeded. Spend limit is PKR ${quotaLimit.toLocaleString()}. Current spend is PKR ${totalSpend.toLocaleString()}.`,
        category: "QUOTA_EXCEEDED"
      });
    }

    // 2. Prompt Safety Keywords Scan
    const unsafeKeywords = ["malware", "hack", "bypass", "exploit", "unauthorized", "steal credentials", "sql injection"];
    const lowercaseMsg = (message || "").toLowerCase();
    for (const kw of unsafeKeywords) {
      if (lowercaseMsg.includes(kw)) {
        return NextResponse.json({
          compliant: false,
          reason: `Prompt failed safety filter: contains unsafe keyword '${kw}'`,
          category: "SAFETY_FILTER"
        });
      }
    }

    // 3. PII Leak Protection Scan
    const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/;
    const secretKeyRegex = /(?:key|password|secret|token|api[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i;
    
    if (creditCardRegex.test(message)) {
      return NextResponse.json({
        compliant: false,
        reason: "PII Leak Protection active: Prompt contains sensitive credit card information.",
        category: "PII_DETECTION"
      });
    }

    if (secretKeyRegex.test(message)) {
      return NextResponse.json({
        compliant: false,
        reason: "Security Alert: Prompt contains potential hardcoded API key or credential secret.",
        category: "PII_DETECTION"
      });
    }

    // 4. Document Security Scan
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.name && (file.name.endsWith(".exe") || file.name.endsWith(".bat") || file.name.endsWith(".sh"))) {
          return NextResponse.json({
            compliant: false,
            reason: `Document Security: Executable file upload block on '${file.name}'`,
            category: "DOCUMENT_SECURITY"
          });
        }
      }
    }

    return NextResponse.json({
      compliant: true,
      currentSpend: totalSpend,
      quotaRemaining: Math.max(0, quotaLimit - totalSpend)
    });

  } catch (error: unknown) {
    console.error("Compliance check error:", error);
    return NextResponse.json({ error: "Internal compliance check failed" }, { status: 500 });
  }
}
