// KOMPASSI - Admin Dashboard
// Real-time metrics, usage chart, and tenant overview.
// Auth handled by AdminAuthGuard in the layout — this page uses session cookies.

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
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

const CardLabel = styled.p`
  font-family: var(--font);
  font-weight: 400;
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CardValue = styled.p`
  font-family: var(--font);
  font-weight: 600;
  font-size: 28px;
  color: var(--text);
  margin: 0;
`;

const CardSub = styled.p`
  font-family: var(--font);
  font-weight: 400;
  font-size: 12px;
  color: var(--text-secondary);
  margin: 4px 0 0;
`;

const ChartCard = styled(Card)`
  grid-column: 1 / -1;
`;

const ChartTitle = styled.h3`
  font-family: var(--font);
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  margin: 0 0 16px;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 300px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font);
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border);
`;

const Td = styled.td`
  padding: 10px 12px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
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
        return "var(--secondary)";
      case "PRO":
        return "var(--primary)";
      default:
        return "var(--text-secondary)";
    }
  }};
  background-color: ${(props) => {
    switch (props.$plan) {
      case "ENTERPRISE":
        return "rgba(30, 58, 95, 0.1)";
      case "PRO":
        return "rgba(201, 160, 61, 0.1)";
      default:
        return "var(--bg-secondary)";
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
  border-bottom: 1px solid var(--border);
  font-family: var(--font);
  font-size: 13px;

  &:last-child {
    border-bottom: none;
  }
`;

const SearchQuery = styled.span`
  color: var(--text);
`;

const SearchCount = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
`;

const LoadingText = styled.p`
  font-family: var(--font);
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  padding: 48px;
`;

const ErrorText = styled.p`
  font-family: var(--font);
  font-size: 14px;
  color: var(--error);
  text-align: center;
  padding: 48px;
`;

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [usage, setUsage] = useState<UsagePoint[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all dashboard data (session cookie sent automatically)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [metricsRes, usageRes, tenantsRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/usage"),
        fetch("/api/admin/tenants"),
      ]);

      if (!metricsRes.ok || !usageRes.ok || !tenantsRes.ok) {
        setError("Failed to load dashboard data. Check your session.");
        return;
      }

      setMetrics(await metricsRes.json());

      const u = await usageRes.json();
      setUsage(u.data ?? []);

      const t = await tenantsRes.json();
      setTenants(t.tenants ?? []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error) {
    return <ErrorText>{error}</ErrorText>;
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
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-secondary)",
                      fontFamily: "Inter",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-secondary)",
                      fontFamily: "Inter",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "var(--text)",
                      backgroundColor: "var(--bg)",
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
                    <Td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      No tenants yet. Run npx prisma db seed.
                    </Td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.id}>
                      <Td>
                        <strong style={{ color: "var(--text)" }}>{t.name}</strong>
                        <br />
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
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
                  <SearchCount>{s.count}x</SearchCount>
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
