// KOMPASSI - Admin Dashboard
// Real-time metrics, usage chart, and tenant overview.

"use client";

import { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

interface DashboardMetrics {
  queries: { total: number; last24h: number };
  cost: { total: number };
  latency: { avg: number };
  tenants: { FREE: number; PRO: number; ENTERPRISE: number; total: number };
  popularSearches: { query: string; count: number }[];
}

interface UsagePoint {
  day: string;
  count: number;
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  queriesPerDay: number;
  users: number;
  documents: number;
  totalQueries: number;
  recentQueries: number;
  recentCost: number;
  createdAt: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// Styled Components
// ═════════════════════════════════════════════════════════════════════════════

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const AuthBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const AuthInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: "JetBrains Mono", monospace;
  font-size: 13px;
  color: #0f172a;
  outline: none;

  &:focus {
    border-color: #c9a03d;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const AuthButton = styled.button`
  padding: 8px 20px;
  background-color: #1e3a5f;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: #162d4a;
  }
`;

const AuthError = styled.span`
  font-family: "Inter", sans-serif;
  font-size: 12px;
  color: #dc2626;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  padding: 24px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const CardLabel = styled.p`
  font-family: "Inter", sans-serif;
  font-weight: 400;
  font-size: 12px;
  color: #475569;
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CardValue = styled.p`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 28px;
  color: #0f172a;
  margin: 0;
`;

const CardSub = styled.p`
  font-family: "Inter", sans-serif;
  font-weight: 400;
  font-size: 12px;
  color: #475569;
  margin: 4px 0 0;
`;

const ChartCard = styled(Card)`
  grid-column: 1 / -1;
`;

const ChartTitle = styled.h3`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: #0f172a;
  margin: 0 0 16px;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 300px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: "Inter", sans-serif;
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  background-color: #f8fafc;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
`;

const Td = styled.td`
  padding: 10px 12px;
  color: #0f172a;
  border-bottom: 1px solid #e2e8f0;
`;

const PlanBadge = styled.span<{ $plan: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => {
    switch (props.$plan) {
      case "ENTERPRISE":
        return "#1e3a5f";
      case "PRO":
        return "#c9a03d";
      default:
        return "#475569";
    }
  }};
  background-color: ${(props) => {
    switch (props.$plan) {
      case "ENTERPRISE":
        return "rgba(30, 58, 95, 0.1)";
      case "PRO":
        return "rgba(201, 160, 61, 0.1)";
      default:
        return "#f8fafc";
    }
  }};
`;

const SearchesList = styled.ol`
  padding: 0;
  margin: 0;
  list-style: none;
`;

const SearchItem = styled.li`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
  font-family: "Inter", sans-serif;
  font-size: 13px;

  &:last-child {
    border-bottom: none;
  }
`;

const SearchQuery = styled.span`
  color: #0f172a;
`;

const SearchCount = styled.span`
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  color: #475569;
`;

const LoadingText = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 14px;
  color: #475569;
  text-align: center;
  padding: 48px;
`;

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [storedKey, setStoredKey] = useState("");

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [usage, setUsage] = useState<UsagePoint[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Authenticate with admin key
  const handleAuth = useCallback(async (key: string) => {
    setAuthError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metrics", {
        headers: { "x-admin-key": key },
      });
      if (!res.ok) {
        setAuthError("Invalid admin key. Check your ADMIN_API_KEY env variable.");
        setLoading(false);
        return;
      }
      setStoredKey(key);
      setIsAuthed(true);
      // Don't set loading false — fetchData will do it
    } catch {
      setAuthError("Failed to connect. Is the server running?");
      setLoading(false);
    }
  }, []);

  // Fetch all dashboard data
  const fetchData = useCallback(async (key: string) => {
    setLoading(true);
    const headers = { "x-admin-key": key };

    try {
      const [metricsRes, usageRes, tenantsRes] = await Promise.all([
        fetch("/api/admin/metrics", { headers }),
        fetch("/api/admin/usage", { headers }),
        fetch("/api/admin/tenants", { headers }),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (usageRes.ok) {
        const u = await usageRes.json();
        setUsage(u.data ?? []);
      }
      if (tenantsRes.ok) {
        const t = await tenantsRes.json();
        setTenants(t.tenants ?? []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthed && storedKey) {
      fetchData(storedKey);
    }
  }, [isAuthed, storedKey, fetchData]);

  // Refresh every 30s
  useEffect(() => {
    if (!isAuthed || !storedKey) return;
    const interval = setInterval(() => fetchData(storedKey), 30000);
    return () => clearInterval(interval);
  }, [isAuthed, storedKey, fetchData]);

  // Not authenticated — show login
  if (!isAuthed) {
    return (
      <Page>
        <Card>
          <CardLabel>Admin Authentication</CardLabel>
          <CardValue style={{ fontSize: 20, marginBottom: 16 }}>
            Enter admin key
          </CardValue>
          <AuthBar>
            <AuthInput
              type="password"
              placeholder="Paste your ADMIN_API_KEY..."
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth(adminKey)}
            />
            <AuthButton
              onClick={() => handleAuth(adminKey)}
              disabled={!adminKey.trim()}
            >
              Unlock
            </AuthButton>
          </AuthBar>
          {authError && <AuthError>{authError}</AuthError>}
          <CardSub style={{ marginTop: 12 }}>
            Set ADMIN_API_KEY in your .env file.
          </CardSub>
        </Card>
      </Page>
    );
  }

  if (loading && !metrics) {
    return <LoadingText>Loading dashboard data...</LoadingText>;
  }

  return (
    <Page>
      {/* ─── Metric Cards ──────────────────────────────────────────── */}

      <Grid>
        <Card>
          <CardLabel>Total Queries</CardLabel>
          <CardValue>{metrics?.queries.total?.toLocaleString() ?? "—"}</CardValue>
          <CardSub>
            {metrics?.queries.last24h ?? "—"} in last 24h
          </CardSub>
        </Card>

        <Card>
          <CardLabel>Total Cost (USD)</CardLabel>
          <CardValue>
            ${metrics?.cost.total?.toLocaleString() ?? "—"}
          </CardValue>
          <CardSub>Across all tenants</CardSub>
        </Card>

        <Card>
          <CardLabel>Avg Latency</CardLabel>
          <CardValue>
            {metrics?.latency.avg ? `${metrics.latency.avg}ms` : "—"}
          </CardValue>
          <CardSub>Per query</CardSub>
        </Card>

        <Card>
          <CardLabel>Tenants</CardLabel>
          <CardValue>{metrics?.tenants.total ?? "—"}</CardValue>
          <CardSub>
            {metrics
              ? `${metrics.tenants.FREE} free · ${metrics.tenants.PRO} pro · ${metrics.tenants.ENTERPRISE} enterprise`
              : "—"}
          </CardSub>
        </Card>

        {/* ─── Usage Chart ──────────────────────────────────────────── */}

        <ChartCard>
          <ChartTitle>Queries per Day (Last 30 Days)</ChartTitle>
          <ChartContainer>
            {usage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usage}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#475569", fontFamily: "Inter" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#475569", fontFamily: "Inter" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "#0f172a",
                      backgroundColor: "#ffffff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#c9a03d"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#c9a03d",
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <LoadingText>No usage data yet.</LoadingText>
            )}
          </ChartContainer>
        </ChartCard>
      </Grid>

      {/* ─── Tenant Table + Popular Searches ─────────────────────────── */}

      <Grid>
        <ChartCard>
          <ChartTitle>Tenants</ChartTitle>
          <div style={{ overflowX: "auto" }}>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Plan</Th>
                  <Th>Queries (30d)</Th>
                  <Th>Cost (30d)</Th>
                  <Th>Docs</Th>
                  <Th>Users</Th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <Td colSpan={6} style={{ textAlign: "center", color: "#94a3b8" }}>
                      No tenants yet. Run npx prisma db seed.
                    </Td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.id}>
                      <Td>
                        <strong style={{ color: "#0f172a" }}>{t.name}</strong>
                        <br />
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {t.slug}
                        </span>
                      </Td>
                      <Td>
                        <PlanBadge $plan={t.plan}>{t.plan}</PlanBadge>
                      </Td>
                      <Td>{t.recentQueries.toLocaleString()}</Td>
                      <Td>${t.recentCost.toLocaleString()}</Td>
                      <Td>{t.documents}</Td>
                      <Td>{t.users}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </ChartCard>

        <Card>
          <ChartTitle>Popular Searches</ChartTitle>
          {metrics?.popularSearches && metrics.popularSearches.length > 0 ? (
            <SearchesList>
              {metrics.popularSearches.map((s, i) => (
                <SearchItem key={i}>
                  <SearchQuery>{s.query}</SearchQuery>
                  <SearchCount>{s.count}×</SearchCount>
                </SearchItem>
              ))}
            </SearchesList>
          ) : (
            <LoadingText>No queries yet.</LoadingText>
          )}
        </Card>
      </Grid>
    </Page>
  );
}
