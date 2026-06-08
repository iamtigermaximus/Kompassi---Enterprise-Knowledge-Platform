// KOMPASSI - Admin Audit Logs
// Paginated, filterable audit log viewer for all tenant queries.

"use client";

import { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import type { QueryLog } from "@prisma/client";

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

interface LogEntry extends QueryLog {
  tenant: { name: string; slug: string };
  user: { email: string; name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TenantFilter {
  id: string;
  name: string;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: Pagination;
  filters: { tenants: TenantFilter[] };
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
  &:hover {
    background-color: #162d4a;
  }
`;

const LoadingState = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 14px;
  color: #475569;
  text-align: center;
  padding: 48px;
`;

const Card = styled.div`
  padding: 24px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const FiltersBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const FilterInput = styled.input`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: "Inter", sans-serif;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  min-width: 200px;
  &:focus {
    border-color: #c9a03d;
  }
  &::placeholder {
    color: #94a3b8;
  }
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: "Inter", sans-serif;
  font-size: 13px;
  color: #0f172a;
  background-color: #ffffff;
  outline: none;
  &:focus {
    border-color: #c9a03d;
  }
`;

const FilterDate = styled.input`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: "Inter", sans-serif;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  &:focus {
    border-color: #c9a03d;
  }
`;

const SummaryBar = styled.div`
  font-family: "Inter", sans-serif;
  font-size: 12px;
  color: #475569;
  margin-bottom: 12px;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: "Inter", sans-serif;
  font-size: 12px;
`;

const Th = styled.th`
  text-align: left;
  padding: 8px 10px;
  background-color: #f8fafc;
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 8px 10px;
  color: #0f172a;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const QueryText = styled.span`
  font-size: 12px;
  line-height: 1.4;
`;

const MonoCell = styled.span`
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
`;

const CostCell = styled.span<{ $cost: number }>`
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  color: ${(props) => (props.$cost > 0.01 ? "#059669" : "#475569")};
`;

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${(props) => (props.$active ? "#c9a03d" : "#e2e8f0")};
  border-radius: 4px;
  background-color: ${(props) => (props.$active ? "rgba(201, 160, 61, 0.1)" : "#ffffff")};
  color: ${(props) => (props.$active ? "#c9a03d" : "#0f172a")};
  font-family: "Inter", sans-serif;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    border-color: #c9a03d;
  }
  &:disabled {
    color: #94a3b8;
    cursor: default;
    border-color: #e2e8f0;
  }
`;

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminLogsPage() {
  // Auth state
  const [adminKey, setAdminKey] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [storedKey, setStoredKey] = useState("");

  // Data state
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Authenticate
  const handleAuth = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs?limit=1", {
        headers: { "x-admin-key": key },
      });
      if (!res.ok) throw new Error("auth");
      setStoredKey(key);
      setIsAuthed(true);
    } catch {
      setLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(
    async (key: string, p: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (search.trim()) params.set("search", search.trim());
      if (tenantFilter) params.set("tenantId", tenantFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      try {
        const res = await fetch(`/api/admin/logs?${params}`, {
          headers: { "x-admin-key": key },
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Logs fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [search, tenantFilter, dateFrom, dateTo]
  );

  // Load on auth or page/filter change
  useEffect(() => {
    if (isAuthed && storedKey) {
      fetchLogs(storedKey, page);
    }
  }, [isAuthed, storedKey, page, fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, tenantFilter, dateFrom, dateTo]);

  // Format timestamp
  const fmtTime = (ts: string | Date) => {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Not authenticated
  if (!isAuthed) {
    return (
      <Page>
        <Card>
          <AuthBar>
            <AuthInput
              type="password"
              placeholder="Enter x-admin-key..."
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
        </Card>
      </Page>
    );
  }

  const { logs = [], pagination, filters } = data ?? {};

  return (
    <Page>
      <Card>
        {/* Filters */}
        <FiltersBar>
          <FilterInput
            placeholder="Search queries or answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FilterSelect
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
          >
            <option value="">All tenants</option>
            {filters?.tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FilterSelect>
          <FilterDate
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
          />
          <FilterDate
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
          />
        </FiltersBar>

        {/* Summary */}
        {pagination && (
          <SummaryBar>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total.toLocaleString()} logs
          </SummaryBar>
        )}

        {/* Table */}
        {loading && !data ? (
          <LoadingState>Loading audit logs...</LoadingState>
        ) : logs.length === 0 ? (
          <LoadingState>No audit logs match your filters.</LoadingState>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Tenant</Th>
                  <Th>User</Th>
                  <Th>Query</Th>
                  <Th>Tokens (in/out)</Th>
                  <Th>Cost</Th>
                  <Th>Latency</Th>
                  <Th>Model</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <Td>
                      <MonoCell>{fmtTime(log.timestamp)}</MonoCell>
                    </Td>
                    <Td>
                      <strong>{log.tenant.name}</strong>
                      <br />
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>
                        {log.tenant.slug} · {log.tenantId.slice(0, 8)}…
                      </span>
                    </Td>
                    <Td>
                      {log.user ? (
                        <>
                          {log.user.name}
                          <br />
                          <span style={{ color: "#94a3b8", fontSize: 11 }}>
                            {log.user.email}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </Td>
                    <Td>
                      <QueryText>{log.query}</QueryText>
                    </Td>
                    <Td>
                      <MonoCell>
                        {log.tokensIn.toLocaleString()} /{" "}
                        {log.tokensOut.toLocaleString()}
                      </MonoCell>
                    </Td>
                    <Td>
                      <CostCell $cost={log.cost}>
                        ${log.cost.toFixed(6)}
                      </CostCell>
                    </Td>
                    <Td>
                      <MonoCell>{log.latency}ms</MonoCell>
                    </Td>
                    <Td>
                      <MonoCell>{log.model}</MonoCell>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <PaginationBar>
            <PageButton
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
            >
              ← Prev
            </PageButton>
            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
              const start = Math.max(
                1,
                Math.min(
                  pagination.page - 3,
                  pagination.totalPages - 6
                )
              );
              const p = start + i;
              if (p > pagination.totalPages) return null;
              return (
                <PageButton
                  key={p}
                  $active={p === pagination.page}
                  onClick={() => setPage(p)}
                >
                  {p}
                </PageButton>
              );
            })}
            <PageButton
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(pagination.page + 1)}
            >
              Next →
            </PageButton>
          </PaginationBar>
        )}
      </Card>
    </Page>
  );
}
