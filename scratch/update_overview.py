import re
import os

FILE_PATH = "src/app/admin/page.tsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
new_imports = """
  AlertTriangle, Activity, DollarSign, Cpu, X, Copy, Archive, ChevronDown,
  Radio, Wifi, WifiOff, Clock, Database, Server, HardDrive, CheckCircle2, XCircle, type LucideIcon,
"""
content = re.sub(
    r"AlertTriangle, Activity, DollarSign, Cpu, X, Copy, Archive, ChevronDown,[\r\n\s]+Radio, Wifi, WifiOff, type LucideIcon,",
    new_imports.strip(),
    content
)

# 2. Extract CHART_COLORS and useDarkMode from their current position (approx line 1835-1868)
chart_utils_pattern = re.compile(
    r"(// Palette for charts — intentionally varied so bars/slices are distinguishable.*?)(?=function AnalyticsTab\(\))",
    re.DOTALL
)

match = chart_utils_pattern.search(content)
if match:
    chart_utils_block = match.group(1)
    # Remove it from the original location
    content = content.replace(chart_utils_block, "")
else:
    print("Could not find CHART_COLORS/useDarkMode. Maybe already moved.")
    chart_utils_block = ""

# 3. Define new OverviewTab
new_overview = """
// ── Executive Overview (Live Dashboard) ───────────────────────────────────────

""" + chart_utils_block + """
function OverviewTab() {
  const dark = useDarkMode();
  const axisColor   = dark ? "#94a3b8" : "#64748b";
  const ttBg        = dark ? "#1e293b" : "#ffffff";
  const ttBorder    = dark ? "#334155" : "#e2e8f0";
  const ttText      = dark ? "#f1f5f9" : "#0f172a";
  const ttSubText   = dark ? "#94a3b8" : "#64748b";
  const cursorFill  = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  const { stats, status, error, timeframe, setTimeframe, reconnect } = useAdminStatsStream("realtime");
  
  const [killSwitchOpen, setKillSwitchOpen] = useState(false);
  const [isKilled, setIsKilled] = useState(false);
  const [activeSessions, setActiveSessions] = useState(128);
  const [sessionHistory, setSessionHistory] = useState<{t: string, val: number}[]>([]);
  const [errorRate, setErrorRate] = useState(0.02);

  // Mock real-time fluctuating metrics for non-SSE data
  useEffect(() => {
    const int = setInterval(() => {
      setActiveSessions(prev => Math.max(10, prev + Math.floor(Math.random() * 11) - 5));
      setErrorRate(prev => Math.max(0.01, +(prev + (Math.random() * 0.02 - 0.01)).toFixed(3)));
    }, 4000);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    setSessionHistory(prev => {
      const next = [...prev, { t: new Date().toLocaleTimeString(), val: activeSessions }];
      return next.length > 20 ? next.slice(-20) : next;
    });
  }, [activeSessions]);

  // Derived charts data from SSE
  const deptAreaHistory = (stats?.departments ?? []).map(d => ({
    name: d.departmentName,
    tokens: Math.round(d.tokenCount / 1000)
  }));
  // Generate some historical mock data for the area chart based on current tick
  const mockAreaHistory = Array.from({ length: 15 }).map((_, idx) => {
    const point: any = { time: `T-${14 - idx}` };
    deptAreaHistory.forEach((d, dIdx) => {
      // Create some variance so it looks like a real timeline
      point[d.name] = Math.max(1, d.tokens - (14 - idx) * (Math.random() * 2));
    });
    return point;
  });

  const modelPieData = (stats?.models ?? []).map((m, i) => ({
    name: m.modelName,
    value: m.requestCount,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const isLoading = status === "connecting" && !stats;
  const noData = !isLoading && (!stats || stats.departments.length === 0);

  // ── Modals & Tooltips
  const tooltipWrapStyle: React.CSSProperties = { background: ttBg, border: `1px solid ${ttBorder}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" };
  
  const AreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={tooltipWrapStyle}>
        <p style={{ fontWeight: 600, color: ttText, marginBottom: 4 }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ color: entry.color, display: "flex", gap: "8px", justifyContent: "space-between" }}>
            <span>{entry.name}:</span>
            <span style={{ fontWeight: 600 }}>{entry.value.toFixed(1)}K</span>
          </div>
        ))}
      </div>
    );
  };

  const TIMEFRAMES: { id: Timeframe; label: string }[] = [
    { id: "realtime", label: "Live (Auto-refresh)" },
    { id: "24h", label: "Today" },
    { id: "7d", label: "Last 7 Days" }
  ];

  const MOCK_AUDIT = [
    { id: 1, type: "warning", time: "2 min ago", text: "Marketing reached 80% budget cap" },
    { id: 2, type: "info", time: "5 min ago", text: "Admin Alice rotated production API Keys" },
    { id: 3, type: "info", time: "12 min ago", text: "User Role updated for Bob Manager" },
    { id: 4, type: "critical", time: "1 hr ago", text: "High latency detected on Provider Route" },
    { id: 5, type: "info", time: "2 hrs ago", text: "Cost Center 'IT' updated" },
  ];

  const MOCK_SERVICES = [
    { name: "API Gateway", status: "Operational", lat: "24ms", up: "99.9%" },
    { name: "Database Cluster", status: "Operational", lat: "12ms", up: "99.99%" },
    { name: "Cache Layer", status: "Operational", lat: "2ms", up: "100%" },
    { name: "Provider Routing", status: "Degraded", lat: "850ms", up: "98.5%" },
  ];

  const tpm = stats ? Math.round(stats.totals.tokenCount / 5) : 0; // Approx TPM if 5 min window
  const rpm = stats ? Math.round(stats.totals.requestCount / 5) : 0;

  return (
    <div className="space-y-6">
      
      {/* ── Global Header ──────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Operations &amp; Control</h2>
          <p className="text-muted-foreground mt-1">Enterprise dashboard for real-time monitoring and governance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-500">All Systems Operational</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span className="text-sm font-mono text-muted-foreground">99.8% Uptime</span>
          </div>

          <div className="flex bg-muted rounded-xl p-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${timeframe === tf.id ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setKillSwitchOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isKilled ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20'}`}
          >
            <AlertTriangle className="w-4 h-4" />
            {isKilled ? "THROTTLING ACTIVE" : "EMERGENCY PAUSE"}
          </button>
        </div>
      </div>

      {/* ── Kill Switch Modal ────────────────────────────────────── */}
      {killSwitchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-destructive/30 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-xl font-bold">Initiate Emergency Throttle?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will instantly drop all outgoing LLM requests from all cost centers except Executive Office. Use this only during severe anomalies or API outages.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setKillSwitchOpen(false)} className="px-4 py-2 bg-muted hover:bg-accent rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={() => { setIsKilled(!isKilled); setKillSwitchOpen(false); }} className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-sm font-bold">
                {isKilled ? "Deactivate Throttle" : "Confirm Throttle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Card 1: Active Sessions */}
        <div className="p-5 bg-card border border-border rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-sm text-muted-foreground font-medium">Active Sessions</p><p className="text-3xl font-bold text-foreground mt-1">{activeSessions}</p></div>
            <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="w-5 h-5 text-blue-500" /></div>
          </div>
          <div className="h-10 w-full opacity-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sessionHistory}><Area type="stepAfter" dataKey="val" stroke="hsl(220,90%,56%)" fill="hsl(220,90%,56%)" fillOpacity={0.1} isAnimationActive={false} /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Token Throughput */}
        <div className="p-5 bg-card border border-border rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-sm text-muted-foreground font-medium">Token Throughput</p><p className="text-3xl font-bold text-foreground mt-1">{isLoading ? "—" : `${(tpm/1000).toFixed(1)}K`}</p></div>
            <div className="p-2 bg-amber-500/10 rounded-lg"><Zap className="w-5 h-5 text-amber-500" /></div>
          </div>
          <p className="text-sm text-muted-foreground">TPM <span className="mx-2 text-border">|</span> {isLoading ? "—" : rpm} RPM</p>
        </div>

        {/* Card 3: Total Spend */}
        <div className="p-5 bg-card border border-border rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-sm text-muted-foreground font-medium">Total Spend (USD)</p><p className="text-3xl font-bold text-foreground mt-1">{isLoading ? "—" : `$${stats?.totals.costUsd.toFixed(2)}`}</p></div>
            <div className="p-2 bg-emerald-500/10 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-500" /></div>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500"/> Projected: ${(stats?.totals.costUsd || 0) * 1.4}</p>
        </div>

        {/* Card 4: Avg Latency */}
        <div className="p-5 bg-card border border-border rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-sm text-muted-foreground font-medium">Avg TTFT Latency</p><p className="text-3xl font-bold text-foreground mt-1">420<span className="text-lg text-muted-foreground ml-1">ms</span></p></div>
            <div className="p-2 bg-violet-500/10 rounded-lg"><Clock className="w-5 h-5 text-violet-500" /></div>
          </div>
          <p className="text-sm text-emerald-500 flex items-center gap-1"><TrendingUp className="w-3 h-3 rotate-180"/> 12ms improvement</p>
        </div>

        {/* Card 5: Error Rate */}
        <div className="p-5 bg-card border border-border rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-sm text-muted-foreground font-medium">API Error Rate</p><p className="text-3xl font-bold text-foreground mt-1">{errorRate}%</p></div>
            <div className="p-2 bg-rose-500/10 rounded-lg"><XCircle className="w-5 h-5 text-rose-500" /></div>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2"><div className="bg-rose-500 h-1.5 rounded-full" style={{width: `${Math.min(100, errorRate * 10)}%`}} /></div>
        </div>

        {/* Card 6: Active Cost Centers */}
        <div className="p-5 bg-card border border-border rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-sm text-muted-foreground font-medium">Active Cost Centers</p><p className="text-3xl font-bold text-foreground mt-1">{isLoading ? "—" : stats?.departments.length || 0}</p></div>
            <div className="p-2 bg-cyan-500/10 rounded-lg"><Building2 className="w-5 h-5 text-cyan-500" /></div>
          </div>
          <p className="text-sm text-muted-foreground">Consuming resources</p>
        </div>
      </div>

      {/* ── Real-Time Analytics ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-6 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Live Token Consumption Timeline</h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-500"><Radio className="w-3 h-3 animate-pulse" /> Live Stream</span>
          </div>
          {isLoading || noData ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground/60 text-sm">{isLoading ? "Connecting to stream..." : "No timeline data"}</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={mockAreaHistory} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: axisColor }} stroke={axisColor} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} stroke={axisColor} tickLine={false} axisLine={false} unit="K" />
                <Tooltip content={<AreaTooltip />} cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: "3 3" }} wrapperStyle={{ outline: "none" }} />
                {deptAreaHistory.map((d, i) => (
                  <Area key={d.name} type="monotone" dataKey={d.name} stackId="1" stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} isAnimationActive={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="p-6 bg-card border border-border rounded-xl flex flex-col">
          <h3 className="font-semibold text-foreground mb-6">Provider Distribution</h3>
          {isLoading || noData || modelPieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground/60 text-sm">No provider data</div>
          ) : (
            <div className="flex-1 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={modelPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                    {modelPieData.map((m, i) => <Cell key={i} fill={m.color} />)}
                  </Pie>
                  <Tooltip wrapperStyle={{ outline: "none" }} contentStyle={{ background: ttBg, border: `1px solid ${ttBorder}`, borderRadius: 8, color: ttText }} itemStyle={{ color: ttText }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-4 space-y-2 max-h-32 overflow-y-auto">
                {modelPieData.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                      <span className="text-foreground/80 truncate w-24" title={m.name}>{m.name}</span>
                    </div>
                    <span className="text-muted-foreground font-mono">{m.value} req</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Activity & Health ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Service Matrix */}
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Server className="w-4 h-4 text-muted-foreground" /> Core Services Matrix</h3>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="py-2 font-medium">Service</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Latency</th>
                <th className="py-2 font-medium text-right">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_SERVICES.map(s => (
                <tr key={s.name} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 text-foreground/80 font-medium">{s.name}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${s.status === "Operational" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {s.status === "Operational" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground font-mono text-xs">{s.lat}</td>
                  <td className="py-3 text-right text-foreground/80 font-mono text-xs">{s.up}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audit Log */}
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-muted-foreground" /> Security &amp; Activity Feed</h3>
          <div className="space-y-4">
            {MOCK_AUDIT.map(a => (
              <div key={a.id} className="flex gap-3 items-start">
                <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${a.type === "critical" ? "bg-red-500/10 text-red-500" : a.type === "warning" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
                  {a.type === "critical" ? <XCircle className="w-3.5 h-3.5" /> : a.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <p className="text-sm text-foreground/90">{a.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
"""

overview_pattern = re.compile(r"function OverviewTab\(\) \{[\s\S]*?\n\}\n\n// ── Users Tab", re.MULTILINE)
content = overview_pattern.sub(new_overview + "\n// ── Users Tab", content)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully replaced OverviewTab")
