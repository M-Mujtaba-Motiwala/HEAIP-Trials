// =============================================================================
// useAdminStatsStream — React hook
// -----------------------------------------------------------------------------
// Subscribes to GET /api/admin/analytics/stream via Server-Sent Events and
// returns the latest parsed payload plus connection-state metadata.
//
// Usage:
//   const { stats, status, error, timeframe, setTimeframe } = useAdminStatsStream();
// =============================================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// --- Payload shape (mirrors the SSE route) -----------------------------------

export interface DepartmentStat {
  departmentName: string;
  tokenCount:     number;
  percentage:     number;
  costUsd:        number;
  requestCount:   number;
}

export interface ModelStat {
  modelName:    string;
  provider:     string;
  requestCount: number;
  percentage:   number;
  tokenCount:   number;
}

export interface StatsTotals {
  tokenCount:   number;
  requestCount: number;
  costUsd:      number;
  activeSessionCount: number;
}

export interface AdminStatsPayload {
  timestamp:   string;
  timeframe:   "realtime" | "24h" | "7d";
  departments: DepartmentStat[];
  models:      ModelStat[];
  totals:      StatsTotals;
}

export type StatsStatus = "connecting" | "live" | "error" | "closed";
export type Timeframe   = "realtime" | "24h" | "7d";

// --- Hook -------------------------------------------------------------------

export function useAdminStatsStream(initialTimeframe: Timeframe = "realtime") {
  const [stats,     setStats]     = useState<AdminStatsPayload | null>(null);
  const [status,    setStatus]    = useState<StatsStatus>("connecting");
  const [error,     setError]     = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);

  // Keep a ref to the active EventSource so we can close it on cleanup/change
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback((tf: Timeframe) => {
    // Close any existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setStatus("connecting");
    setError(null);

    const url = `/api/admin/analytics/stream?timeframe=${tf}`;
    const es  = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.addEventListener("stats", (e: MessageEvent) => {
      try {
        const payload: AdminStatsPayload = JSON.parse(e.data);
        setStats(payload);
        setStatus("live");
        setError(null);
      } catch {
        setError("Malformed payload from server");
        setStatus("error");
      }
    });

    es.addEventListener("error", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setError(payload.message ?? "Stream error");
      } catch {
        // Generic network/connection error (e.data is empty for onerror events)
        setError("Connection error");
      }
      setStatus("error");
    });

    // onerror fires when the browser cannot establish / reconnect the connection
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setStatus("closed");
        esRef.current = null;
      } else {
        // CONNECTING: browser is auto-reconnecting — show error briefly
        setStatus("error");
        setError("Connection lost — reconnecting…");
      }
    };
  }, []);

  // Connect on mount and whenever timeframe changes
  useEffect(() => {
    connect(timeframe);
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect, timeframe]);

  const reconnect = useCallback(() => connect(timeframe), [connect, timeframe]);

  return {
    stats,
    status,
    error,
    timeframe,
    setTimeframe,  // changing this automatically reconnects
    reconnect,
  };
}
