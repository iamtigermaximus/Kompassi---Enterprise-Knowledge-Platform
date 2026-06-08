// KOMPASSI - Admin Layout
// Responsive sidebar with hamburger menu, theme toggle, and logout.
// Wraps children with AdminAuthGuard for session validation.

"use client";

import { useState, useCallback } from "react";
import styled from "styled-components";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminAuthGuard, useAdminSession } from "@/components/AdminAuthGuard";
import { useTheme } from "@/components/ThemeProvider";

// ─── Styled Components ───────────────────────────────────────────────

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-secondary);
`;

const Sidebar = styled.nav<{ $open: boolean }>`
  width: 240px;
  background-color: var(--sidebar-bg);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.25s ease;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    transform: ${(props) =>
      props.$open ? "translateX(0)" : "translateX(-100%)"};
  }
`;

const Overlay = styled.div<{ $visible: boolean }>`
  display: ${(props) => (props.$visible ? "block" : "none")};
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 99;

  @media (min-width: 769px) {
    display: none;
  }
`;

const SidebarHeader = styled.div`
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const SidebarTitle = styled.h1`
  font-family: var(--font);
  font-weight: 600;
  font-size: 18px;
  color: var(--sidebar-active);
  letter-spacing: 0.03em;
  margin: 0;
`;

const SidebarSubtitle = styled.p`
  font-family: var(--font);
  font-weight: 400;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin: 4px 0 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 12px 0;
  margin: 0;
  flex: 1;
`;

const NavItem = styled.li<{ $active: boolean }>`
  a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    font-family: var(--font);
    font-size: 14px;
    font-weight: ${(props) => (props.$active ? "600" : "400")};
    color: ${(props) =>
      props.$active ? "var(--sidebar-active)" : "var(--sidebar-text)"};
    background-color: ${(props) =>
      props.$active ? "rgba(201, 160, 61, 0.12)" : "transparent"};
    text-decoration: none;
    transition: background-color 0.15s ease;
    border-left: 3px solid
      ${(props) => (props.$active ? "var(--sidebar-active)" : "transparent")};

    &:hover {
      background-color: rgba(201, 160, 61, 0.08);
      color: #ffffff;
    }
  }
`;

const NavIcon = styled.span`
  font-size: 16px;
  width: 20px;
  text-align: center;
`;

const SidebarFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--sidebar-active);
  color: var(--sidebar-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font);
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
`;

const UserName = styled.span`
  font-family: var(--font);
  font-weight: 500;
  font-size: 13px;
  color: #ffffff;
`;

const UserEmail = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background-color: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: rgba(220, 38, 38, 0.15);
    border-color: rgba(220, 38, 38, 0.3);
    color: #f87171;
  }
`;

const Main = styled.main`
  flex: 1;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
`;

const MainHeader = styled.div`
  background-color: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 768px) {
    padding: 12px 16px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Hamburger = styled.button`
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  background-color: var(--bg);
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const HeaderTitle = styled.h2`
  font-family: var(--font);
  font-weight: 600;
  font-size: 16px;
  color: var(--text);
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderBadge = styled.span`
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
`;

const ThemeToggleBtn = styled.button`
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background-color: var(--bg);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--primary);
  }
`;

const Content = styled.div`
  padding: 32px;
  flex: 1;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

// ─── Nav Items ───────────────────────────────────────────────────────

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: "◉" },
  { path: "/admin/tenants", label: "Tenants", icon: "⊞" },
  { path: "/admin/logs", label: "Audit Logs", icon: "☰" },
] as const;

// ─── Inner Layout (after AuthGuard) ──────────────────────────────────

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAdminSession();
  const { theme, toggle: toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <Layout>
      {/* Mobile overlay */}
      <Overlay $visible={sidebarOpen} onClick={closeSidebar} />

      {/* Sidebar */}
      <Sidebar $open={sidebarOpen}>
        <SidebarHeader>
          <SidebarTitle>KOMPASSI</SidebarTitle>
          <SidebarSubtitle>Admin Panel</SidebarSubtitle>
        </SidebarHeader>

        <NavList>
          {navItems.map((item) => (
            <NavItem key={item.path} $active={pathname === item.path}>
              <Link href={item.path} onClick={closeSidebar}>
                <NavIcon>{item.icon}</NavIcon>
                {item.label}
              </Link>
            </NavItem>
          ))}
        </NavList>

        <SidebarFooter>
          {user && (
            <UserInfo>
              <UserAvatar>{initials}</UserAvatar>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <UserName>{user.name}</UserName>
                <UserEmail>{user.email}</UserEmail>
              </div>
            </UserInfo>
          )}
          <LogoutButton onClick={handleLogout}>Sign Out</LogoutButton>
        </SidebarFooter>
      </Sidebar>

      {/* Main content */}
      <Main>
        <MainHeader>
          <HeaderLeft>
            <Hamburger onClick={() => setSidebarOpen((v) => !v)}>
              {sidebarOpen ? "✕" : "☰"}
            </Hamburger>
            <HeaderTitle>
              {navItems.find((n) => n.path === pathname)?.label ?? "Admin"}
            </HeaderTitle>
          </HeaderLeft>
          <HeaderActions>
            <HeaderBadge>v0.1.0</HeaderBadge>
            <ThemeToggleBtn onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </ThemeToggleBtn>
          </HeaderActions>
        </MainHeader>
        <Content>{children}</Content>
      </Main>
    </Layout>
  );
}

// ─── Exported Layout (wraps with AuthGuard) ──────────────────────────

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminAuthGuard><AdminLayoutInner>{children}</AdminLayoutInner></AdminAuthGuard>;
}
