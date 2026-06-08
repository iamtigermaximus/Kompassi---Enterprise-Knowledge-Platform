// KOMPASSI - Admin Tenants
// Tenant management page with overview table.
// Auth handled by AdminAuthGuard in the layout.

"use client";

import { useState, useEffect, useCallback } from "react";
import styled from "styled-components";

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

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

const Card = styled.div`
  padding: 24px;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  font-family: var(--font);
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  margin: 0;
`;

const TableWrap = styled.div`
  overflow-x: auto;
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

const LoadingText = styled.p`
  font-family: var(--font);
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  padding: 48px;
`;

const CodeBlock = styled.code`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
`;

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants ?? []);
      }
    } catch (err) {
      console.error("Tenants fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const fmtDate = (ts: string | Date) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalQueries = tenants.reduce((sum, t) => sum + t.totalQueries, 0);
  const totalUsers = tenants.reduce((sum, t) => sum + t.users, 0);
  const totalDocs = tenants.reduce((sum, t) => sum + t.documents, 0);

  return (
    <Page>
      {/* Quick stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        <Card style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Total Tenants
          </div>
          <div
            style={{
              fontFamily: "var(--font)",
              fontWeight: 600,
              fontSize: "28px",
              color: "var(--text)",
            }}
          >
            {tenants.length}
          </div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Total Users
          </div>
          <div
            style={{
              fontFamily: "var(--font)",
              fontWeight: 600,
              fontSize: "28px",
              color: "var(--text)",
            }}
          >
            {totalUsers}
          </div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Total Documents
          </div>
          <div
            style={{
              fontFamily: "var(--font)",
              fontWeight: 600,
              fontSize: "28px",
              color: "var(--text)",
            }}
          >
            {totalDocs}
          </div>
        </Card>
      </div>

      {/* Tenant list */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-secondary)",
            }}
          >
            {totalQueries.toLocaleString()} total queries across all tenants
          </span>
        </CardHeader>

        {loading ? (
          <LoadingText>Loading tenants...</LoadingText>
        ) : tenants.length === 0 ? (
          <LoadingText>
            No tenants yet. Run <CodeBlock>npx prisma db seed</CodeBlock>.
          </LoadingText>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Slug</Th>
                  <Th>Plan</Th>
                  <Th>Daily Limit</Th>
                  <Th>Users</Th>
                  <Th>Docs</Th>
                  <Th>30d Queries</Th>
                  <Th>30d Cost</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <strong>{t.name}</strong>
                    </Td>
                    <Td>
                      <CodeBlock>{t.slug}</CodeBlock>
                    </Td>
                    <Td>
                      <PlanBadge $plan={t.plan}>{t.plan}</PlanBadge>
                    </Td>
                    <Td>{t.queriesPerDay.toLocaleString()}/day</Td>
                    <Td>{t.users}</Td>
                    <Td>{t.documents}</Td>
                    <Td>{t.recentQueries.toLocaleString()}</Td>
                    <Td>${t.recentCost.toLocaleString()}</Td>
                    <Td>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {fmtDate(t.createdAt)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </Page>
  );
}
