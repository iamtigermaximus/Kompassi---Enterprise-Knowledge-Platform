// KOMPASSI - Admin Audit Logs
// Paginated, filterable audit log viewer for all tenant queries.
// Auth handled by AdminAuthGuard in the layout.

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

const LoadingState = styled.p`
  font-family: var(--font);
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  padding: 48px;
`;

const Card = styled.div`
  padding: 24px;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

const FiltersBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const FilterInput = styled.input`
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--text);
  background-color: var(--bg);
  outline: none;
  min-width: 200px;
  &:focus {
    border-color: var(--primary);
  }
  &::placeholder {
    color: var(--text-muted);
  }
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--text);
  background-color: var(--bg);
  outline: none;
  &:focus {
    border-color: var(--primary);
  }
`;

const FilterDate = styled.input`
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--text);
  background-color: var(--bg);
  outline: none;
  &:focus {
    border-color: var(--primary);
  }
`;

const SummaryBar = styled.div`
  font-family: var(--font);
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font);
  font-size: 12px;
`;

const Th = styled.th`
  text-align: left;
  padding: 8px 10px;
  background-color: var(--bg-secondary);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 8px 10px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
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
  font-family: var(--font-mono);
  font-size: 11px;
`;

const CostCell = styled.span<{ $cost: number }>`
  font-family: var(--font-mono);
  font-size: 11px;
  color: ${(props) => (props.$cost > 0.01 ? "var(--success)" : "var(--text-secondary)")};
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
  border: 1px solid ${(props) => (props.$active ? "var(--primary)" : "var(--border)")};
  border-radius: 4px;
  background-color: ${(props) =>
    props.$active ? "rgba(201, 160, 61, 0.1)" : "var(--bg)"};
  color: ${(props) => (props.$active ? "var(--primary)" : "var(--text)")};
  font-family: var(--font);
  font-size: 12px;
  cursor: pointer;
  &:hover {
    border-color: var(--primary);
  }
  &:disabled {
    color: var(--text-muted);
    cursor: default;
    border-color: var(--border);
  }
`;

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminLogsPage() {
  // Data state
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Fetch logs (session cookie sent automatically)
  const fetchLogs = useCallback(
    async (p: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (search.trim()) params.set("search", search.trim());
      if (tenantFilter) params.set("tenantId", tenantFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      try {
        const res = await fetch(`/api/admin/logs?${params}`);
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

  // Load on mount or page/filter change
  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

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
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        {log.tenant.slug} &middot; {log.tenantId.slice(0, 8)}&hellip;
                      </span>
                    </Td>
                    <Td>
                      {log.user ? (
                        <>
                          {log.user.name}
                          <br />
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                            {log.user.email}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
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
              &larr; Prev
            </PageButton>
            {Array.from(
              { length: Math.min(pagination.totalPages, 7) },
              (_, i) => {
                const start = Math.max(
                  1,
                  Math.min(pagination.page - 3, pagination.totalPages - 6)
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
              }
            )}
            <PageButton
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(pagination.page + 1)}
            >
              Next &rarr;
            </PageButton>
          </PaginationBar>
        )}
      </Card>
    </Page>
  );
}
