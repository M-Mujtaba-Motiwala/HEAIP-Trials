// =============================================================================
// GET /api/admin/analytics/stream
// -----------------------------------------------------------------------------
// Server-Sent Events (SSE) endpoint — pushes live usage statistics to the
// Admin Panel every 4 seconds.
//
// Query params:
//   timeframe=realtime | 24h | 7d   (default: realtime)
//
// SSE message format:
//   event: stats
//   data: <JSON>
//
// JSON shape:
//   {
//     timestamp: string (ISO-8601),
//     timeframe: "realtime" | "24h" | "7d",
//     departments: Array<{
//       departmentName: string,
//       tokenCount: number,
//       percentage: number,
//       costUsd: number,
//       requestCount: number,
//     }>,
//     models: Array<{
//       modelName: string,
//       provider: string,
//       requestCount: number,
//       percentage: number,
//       tokenCount: number,
//     }>,
//     totals: { tokenCount: number; requestCount: number; costUsd: number },
//   }
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { enforceAnalyticsVisibility } from "@/lib/policy-enforcer";

// --- Config ------------------------------------------------------------------

const EMIT_INTERVAL_MS = 4_000;    // push every 4 s
const MAX_DURATION_MS  = 300_000;  // hard cap: close after 5 minutes

type Timeframe = "realtime" | "24h" | "7d";

/** Convert a timeframe string into a `since` Date. */
function sinceDate(timeframe: Timeframe): Date {
  const now = Date.now();
  switch (timeframe) {
    case "realtime": return new Date(now - 5 * 60_000);   // last 5 min
    case "24h":      return new Date(now - 24 * 3_600_000);
    case "7d":       return new Date(now - 7 * 24 * 3_600_000);
  }
}

// --- Core aggregation --------------------------------------------------------

async function aggregateStats(
  timeframe: Timeframe,
  departmentFilter: Record<string, unknown>
) {
  const since = sinceDate(timeframe);
  const dateFilter = { createdAt: { gte: since } };
  const where = { ...departmentFilter, ...dateFilter };

  // Department breakdown
  const byDept = await db.usageLog.groupBy({
    by: ["department"],
    where,
    _sum:   { tokensInput: true, tokensOutput: true, costUsd: true },
    _count: { id: true },
    orderBy: { _sum: { tokensInput: "desc" } },
    take: 20,
  });

  // Model breakdown
  const byModel = await db.usageLog.groupBy({
    by: ["aiProvider", "aiModel"],
    where,
    _sum:   { tokensInput: true, tokensOutput: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 15,
  });

  // Compute totals
  const totalTokens  = byDept.reduce((s, r) => s + (r._sum.tokensInput ?? 0) + (r._sum.tokensOutput ?? 0), 0);
  const totalRequests = byDept.reduce((s, r) => s + (r._count.id), 0);
  const totalCost    = byDept.reduce((s, r) => s + (r._sum.costUsd ?? 0), 0);

  const activeSessionCount = await db.activeSession.count({
    where: { lastActiveAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } }
  });

  const departments = byDept.map(r => {
    const tokenCount = (r._sum.tokensInput ?? 0) + (r._sum.tokensOutput ?? 0);
    return {
      departmentName: r.department,
      tokenCount,
      percentage: totalTokens > 0 ? Math.round((tokenCount / totalTokens) * 1000) / 10 : 0,
      costUsd: Math.round((r._sum.costUsd ?? 0) * 10000) / 10000,
      requestCount: r._count.id,
    };
  });

  const totalModelRequests = byModel.reduce((s, r) => s + r._count.id, 0);
  const models = byModel.map(r => {
    const tokenCount = (r._sum.tokensInput ?? 0) + (r._sum.tokensOutput ?? 0);
    return {
      modelName:    r.aiModel,
      provider:     r.aiProvider,
      requestCount: r._count.id,
      percentage:   totalModelRequests > 0 ? Math.round((r._count.id / totalModelRequests) * 1000) / 10 : 0,
      tokenCount,
    };
  });

  return {
    departments,
    models,
    totals: {
      tokenCount:   totalTokens,
      requestCount: totalRequests,
      costUsd:      Math.round(totalCost * 10000) / 10000,
      activeSessionCount,
    },
  };
}

// --- Route Handler -----------------------------------------------------------

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "analytics.view");
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  // ── Parse timeframe ───────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const rawTimeframe = searchParams.get("timeframe") ?? "realtime";
  const timeframe: Timeframe =
    rawTimeframe === "24h" || rawTimeframe === "7d" ? rawTimeframe : "realtime";

  // ── SSE Stream ────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = Date.now();

      /** Encode a single SSE event. */
      const emit = (eventName: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      /** Push one snapshot. */
      const pushStats = async () => {
        if (isClosed) return;
        try {
          // Re-evaluate visibility per tick so policy changes take effect
          const visibility = await enforceAnalyticsVisibility();
          if (!visibility.allowed) {
            emit("error", { message: visibility.decision.blockReason ?? "Access denied" });
            return;
          }

          const departmentFilter: Record<string, unknown> = {};
          if (!visibility.visibleDepartments.includes("*")) {
            if (visibility.visibleDepartments.length === 0) {
              emit("stats", {
                timestamp: new Date().toISOString(),
                timeframe,
                departments: [],
                models: [],
                totals: { tokenCount: 0, requestCount: 0, costUsd: 0 },
              });
              return;
            }
            departmentFilter.department = { in: visibility.visibleDepartments };
          }

          const { departments, models, totals } = await aggregateStats(timeframe, departmentFilter);
          emit("stats", {
            timestamp: new Date().toISOString(),
            timeframe,
            departments,
            models,
            totals,
          });
        } catch (err) {
          console.error("[SSE_STATS_ERROR]", err);
          emit("error", { message: "Aggregation error" });
        }
      };

      const schedule = async () => {
        if (isClosed) return;
        if (Date.now() - startedAt >= MAX_DURATION_MS) {
          // Send a final keepalive comment and close gracefully
          controller.enqueue(encoder.encode(": stream closed — max duration reached\n\n"));
          controller.close();
          return;
        }
        await pushStats();
        if (!isClosed) {
          timer = setTimeout(schedule, EMIT_INTERVAL_MS);
        }
      };

      // Emit immediately on connect, then start the loop
      await schedule();
    },

    cancel() {
      isClosed = true;
      if (timer !== null) clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":                "text/event-stream",
      "Cache-Control":               "no-cache, no-transform",
      "Connection":                  "keep-alive",
      "X-Accel-Buffering":          "no",   // disable nginx/proxy buffering
      "Access-Control-Allow-Origin": "*",
    },
  });
}
