// KOMPASSI - Tenant Workspace
// Authenticated via session cookie (email/password login).
// Upload PDFs and chat with your documents via RAG.
// Route: /workspace

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  queriesPerDay: number;
  createdAt: string;
}

interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: string;
}

interface DocumentRow {
  id: string;
  title: string;
  filename: string;
  fileSize: number;
  status: string;
  createdAt: string;
  chunksCreated?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; chunkIndex: number }[];
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  latency?: number;
  error?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// Styled Components
// ═══════════════════════════════════════════════════════════════════

const Page = styled.div`
  min-height: 100vh;
  background-color: var(--bg);
  font-family: var(--font);
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: var(--bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;

  @media (max-width: 640px) {
    padding: 12px 16px;
  }
`;

const NavLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const NavBrandLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
`;

const NavCompass = styled.div`
  width: 22px;
  height: 22px;
  border: 2px solid var(--primary);
  border-radius: 50%;
  position: relative;
  &::after {
    content: "";
    position: absolute;
    width: 2px;
    height: 10px;
    background: var(--primary);
    top: 3px;
    left: 50%;
    transform: translateX(-50%) rotate(-30deg);
    transform-origin: bottom center;
  }
  &::before {
    content: "";
    position: absolute;
    width: 2px;
    height: 7px;
    background: var(--secondary);
    top: 5px;
    left: 50%;
    transform: translateX(-50%) rotate(30deg);
    transform-origin: bottom center;
  }
`;

const NavBrand = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  letter-spacing: 0.04em;
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TenantBadge = styled.span`
  font-family: var(--font);
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--bg-secondary);

  @media (max-width: 480px) {
    display: none;
  }
`;

const UserName = styled.span`
  font-family: var(--font);
  font-size: 12px;
  color: var(--text);
  font-weight: 500;
`;

const SignOutBtn = styled.button`
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: none;
  color: var(--text-secondary);
  font-family: var(--font);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: var(--error);
    color: var(--error);
  }
`;

const ThemeBtn = styled.button`
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background-color: var(--bg);
  color: var(--text-secondary);
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    border-color: var(--primary);
  }
`;

const Main = styled.main`
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 640px) {
    padding: 16px;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 24px;
  border: none;
  border-bottom: 2px solid
    ${(p) => (p.$active ? "var(--primary)" : "transparent")};
  background: none;
  color: ${(p) => (p.$active ? "var(--primary)" : "var(--text-secondary)")};
  font-family: var(--font);
  font-weight: ${(p) => (p.$active ? "600" : "400")};
  font-size: 14px;
  cursor: pointer;

  &:hover {
    color: var(--primary);
  }
`;

// ─── Upload Tab ────────────────────────────────────────────────────

const UploadGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  padding: 24px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

const CardTitle = styled.h3`
  font-family: var(--font);
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  margin: 0 0 16px;
`;

const DropZone = styled.div<{ $dragging: boolean; $disabled: boolean }>`
  border: 2px dashed
    ${(p) => (p.$dragging ? "var(--primary)" : "var(--border)")};
  border-radius: var(--radius);
  padding: 48px 24px;
  text-align: center;
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  transition: all 0.15s;
  background-color: ${(p) =>
    p.$dragging ? "rgba(201, 160, 61, 0.05)" : "var(--bg)"};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};

  &:hover {
    border-color: ${(p) =>
      p.$disabled ? "var(--border)" : "var(--primary)"};
  }
`;

const DropIcon = styled.div`
  font-size: 40px;
  margin-bottom: 12px;
  color: var(--text-muted);
`;

const DropText = styled.p`
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  margin: 0 0 4px;
`;

const DropSub = styled.p`
  font-family: var(--font);
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
`;

const UploadingBar = styled.div`
  margin-top: 12px;
  padding: 10px 14px;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SpinnerIcon = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorMsg = styled.div`
  margin-top: 12px;
  padding: 10px 14px;
  background-color: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--error);
`;

const SuccessMsg = styled.div`
  margin-top: 12px;
  padding: 10px 14px;
  background-color: var(--success-bg);
  border: 1px solid var(--success);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--success);
`;

const DocList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DocRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
`;

const DocInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DocName = styled.span`
  font-family: var(--font);
  font-weight: 500;
  font-size: 13px;
  color: var(--text);
`;

const DocMeta = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
`;

const DocStatus = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: var(--font);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${(p) =>
    p.$status === "READY"
      ? "var(--success)"
      : p.$status === "ERROR"
        ? "var(--error)"
        : "var(--text-secondary)"};
  background-color: ${(p) =>
    p.$status === "READY"
      ? "var(--success-bg)"
      : p.$status === "ERROR"
        ? "var(--error-bg)"
        : "var(--bg-secondary)"};
`;

const EmptyState = styled.p`
  font-family: var(--font);
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 32px;
`;

// ─── Chat Tab ──────────────────────────────────────────────────────

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px);
  min-height: 500px;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ChatEmpty = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
`;

const ChatEmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.4;
`;

const ChatEmptyText = styled.p`
  font-family: var(--font);
  font-size: 14px;
  margin: 0 0 4px;
`;

const ChatEmptySub = styled.p`
  font-family: var(--font);
  font-size: 12px;
  margin: 0;
`;

const MessageBubble = styled.div<{ $role: "user" | "assistant" }>`
  padding: 14px 18px;
  border-radius: 12px;
  max-width: 85%;
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;

  ${(p) =>
    p.$role === "user"
      ? `
    align-self: flex-end;
    background-color: var(--secondary);
    color: #ffffff;
    border-bottom-right-radius: 4px;
  `
      : `
    align-self: flex-start;
    background-color: var(--bg-secondary);
    color: var(--text);
    border: 1px solid var(--border);
    border-bottom-left-radius: 4px;
  `}
`;

const SourcesFooter = styled.div`
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const SourceTag = styled.span`
  display: inline-block;
  padding: 3px 10px;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: var(--font);
  font-size: 11px;
  color: var(--text-secondary);
`;

const MetaFooter = styled.div`
  margin-top: 8px;
  display: flex;
  gap: 16px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
`;

const ChatInputBar = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
`;

const ChatInput = styled.textarea`
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  background-color: var(--bg-secondary);
  outline: none;
  resize: none;
  min-height: 44px;
  max-height: 120px;

  &:focus {
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const SendBtn = styled.button`
  padding: 0 20px;
  background-color: var(--primary);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-family: var(--font);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  align-self: flex-end;
  min-height: 44px;

  &:hover:not(:disabled) {
    background-color: var(--primary-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RequireLogin = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  gap: 16px;
`;

const LoginLink = styled(Link)`
  padding: 10px 24px;
  background-color: var(--primary);
  color: #ffffff;
  border-radius: 6px;
  font-family: var(--font);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;

  &:hover {
    background-color: var(--primary-hover);
  }
`;

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export default function WorkspacePage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const router = useRouter();

  // ─── Session state ──────────────────────────────────────────────
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ─── Tab state ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"upload" | "chat">("upload");

  // ─── Upload state ───────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Chat state ─────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Load session + tenant on mount ─────────────────────────────
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          // Fetch tenant info
          return fetch("/api/tenants/me").then((r) =>
            r.ok ? r.json() : null
          );
        }
        return null;
      })
      .then((tenantData) => {
        if (tenantData?.tenant) {
          setTenant(tenantData.tenant);
        }
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, []);

  // ─── Sign out ───────────────────────────────────────────────────
  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  // ─── Upload handler ─────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are accepted.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 20 MB.");
      return;
    }

    setUploadError("");
    setUploadSuccess("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed.");
        return;
      }

      setUploadSuccess(
        `"${data.document.title}" uploaded — ${data.chunksCreated} chunks indexed.`
      );

      setDocuments((prev) => [
        {
          id: data.document.id,
          title: data.document.title,
          filename: data.document.filename,
          fileSize: data.document.fileSize,
          status: data.document.status,
          createdAt: new Date().toISOString(),
          chunksCreated: data.chunksCreated,
        },
        ...prev,
      ]);
    } catch {
      setUploadError("Network error during upload.");
    } finally {
      setUploading(false);
    }
  }, []);

  // ─── Drag & drop ────────────────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  // ─── Chat handler ───────────────────────────────────────────────
  const handleSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const query = chatInput.trim();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.error || "Chat failed.",
            error: true,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          tokensIn: data.tokensIn,
          tokensOut: data.tokensOut,
          cost: data.cost,
          latency: data.latency,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Network error. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─── Auto-scroll chat ───────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Format helpers ─────────────────────────────────────────────
  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Loading ────────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <Page>
        <Nav>
          <NavLeft>
            <NavBrandLink href="/">
              <NavCompass />
              <NavBrand>KOMPASSI</NavBrand>
            </NavBrandLink>
          </NavLeft>
          <NavRight>
            <ThemeBtn onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </ThemeBtn>
          </NavRight>
        </Nav>
        <RequireLogin>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Loading...
          </p>
        </RequireLogin>
      </Page>
    );
  }

  // ─── Not logged in ──────────────────────────────────────────────
  if (!user) {
    return (
      <Page>
        <Nav>
          <NavLeft>
            <NavBrandLink href="/">
              <NavCompass />
              <NavBrand>KOMPASSI</NavBrand>
            </NavBrandLink>
          </NavLeft>
          <NavRight>
            <ThemeBtn onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </ThemeBtn>
          </NavRight>
        </Nav>
        <RequireLogin>
          <ChatEmptyIcon>🔐</ChatEmptyIcon>
          <CardTitle>Sign in to access your workspace</CardTitle>
          <DropSub>
            Upload documents and ask questions using the RAG engine.
          </DropSub>
          <LoginLink href="/login">Sign In</LoginLink>
        </RequireLogin>
      </Page>
    );
  }

  // ─── Authenticated ──────────────────────────────────────────────
  return (
    <Page>
      {/* ── Nav Bar ──────────────────────────────────────────────── */}
      <Nav>
        <NavLeft>
          <NavBrandLink href="/">
            <NavCompass />
            <NavBrand>KOMPASSI</NavBrand>
          </NavBrandLink>
        </NavLeft>
        <NavRight>
          {tenant && (
            <TenantBadge>
              {tenant.name} · {tenant.plan}
            </TenantBadge>
          )}
          <UserName>{user.name}</UserName>
          <SignOutBtn onClick={handleSignOut}>Sign Out</SignOutBtn>
          <ThemeBtn onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </ThemeBtn>
        </NavRight>
      </Nav>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <Main>
        {/* ── Tabs ───────────────────────────────────────────── */}
        <Tabs>
          <Tab
            $active={activeTab === "upload"}
            onClick={() => setActiveTab("upload")}
          >
            Documents
          </Tab>
          <Tab
            $active={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </Tab>
        </Tabs>

        {/* ── Upload Tab ─────────────────────────────────────── */}
        {activeTab === "upload" && (
          <UploadGrid>
            <Card>
              <CardTitle>Upload PDF</CardTitle>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <DropZone
                $dragging={dragging}
                $disabled={uploading}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <DropIcon>📄</DropIcon>
                <DropText>Drop a PDF here or click to browse</DropText>
                <DropSub>Max 20 MB · PDF only</DropSub>
              </DropZone>

              {uploading && (
                <UploadingBar>
                  <SpinnerIcon />
                  Uploading and indexing...
                </UploadingBar>
              )}
              {uploadError && <ErrorMsg>{uploadError}</ErrorMsg>}
              {uploadSuccess && <SuccessMsg>{uploadSuccess}</SuccessMsg>}
            </Card>

            <Card>
              <CardTitle>
                Documents
                {documents.length > 0 && (
                  <span
                    style={{
                      fontWeight: 400,
                      fontSize: 13,
                      color: "var(--text-muted)",
                      marginLeft: 8,
                    }}
                  >
                    ({documents.length})
                  </span>
                )}
              </CardTitle>
              {documents.length === 0 ? (
                <EmptyState>
                  No documents yet. Upload a PDF to get started.
                </EmptyState>
              ) : (
                <DocList>
                  {documents.map((doc) => (
                    <DocRow key={doc.id}>
                      <DocInfo>
                        <DocName>{doc.title}</DocName>
                        <DocMeta>
                          {fmtSize(doc.fileSize)}
                          {doc.chunksCreated !== undefined &&
                            ` · ${doc.chunksCreated} chunks`}
                        </DocMeta>
                      </DocInfo>
                      <DocStatus $status={doc.status}>
                        {doc.status}
                      </DocStatus>
                    </DocRow>
                  ))}
                </DocList>
              )}
            </Card>
          </UploadGrid>
        )}

        {/* ── Chat Tab ───────────────────────────────────────── */}
        {activeTab === "chat" && (
          <ChatContainer>
            <ChatMessages>
              {messages.length === 0 ? (
                <ChatEmpty>
                  <ChatEmptyIcon>💬</ChatEmptyIcon>
                  <ChatEmptyText>
                    Ask a question about your documents
                  </ChatEmptyText>
                  <ChatEmptySub>
                    The RAG engine will search your uploaded PDFs and generate
                    an answer with citations.
                  </ChatEmptySub>
                </ChatEmpty>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} $role={msg.role}>
                    {msg.content}

                    {msg.sources && msg.sources.length > 0 && (
                      <SourcesFooter>
                        {msg.sources.map((s, i) => (
                          <SourceTag key={i}>{s.title}</SourceTag>
                        ))}
                      </SourcesFooter>
                    )}

                    {msg.tokensIn !== undefined && (
                      <MetaFooter>
                        <span>In: {msg.tokensIn?.toLocaleString()} tok</span>
                        <span>
                          Out: {msg.tokensOut?.toLocaleString()} tok
                        </span>
                        {msg.cost !== undefined && (
                          <span>${msg.cost.toFixed(6)}</span>
                        )}
                        {msg.latency !== undefined && (
                          <span>{msg.latency}ms</span>
                        )}
                      </MetaFooter>
                    )}
                  </MessageBubble>
                ))
              )}
              <div ref={chatEndRef} />
            </ChatMessages>

            <ChatInputBar>
              <ChatInput
                placeholder="Ask a question about your documents..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
              />
              <SendBtn
                onClick={handleSend}
                disabled={!chatInput.trim() || chatLoading}
              >
                {chatLoading ? "..." : "Send"}
              </SendBtn>
            </ChatInputBar>
          </ChatContainer>
        )}
      </Main>
    </Page>
  );
}
