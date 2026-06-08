// KOMPASSI - Admin Layout
// Sidebar navigation + content area for admin pages.

"use client";

import styled from "styled-components";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f8fafc;
`;

const Sidebar = styled.nav`
  width: 240px;
  background-color: #1e3a5f;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 0;
  flex-shrink: 0;
`;

const SidebarHeader = styled.div`
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const SidebarTitle = styled.h1`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 18px;
  color: #c9a03d;
  letter-spacing: 0.03em;
  margin: 0;
`;

const SidebarSubtitle = styled.p`
  font-family: "Inter", sans-serif;
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
`;

const NavItem = styled.li<{ $active: boolean }>`
  a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    font-family: "Inter", sans-serif;
    font-size: 14px;
    font-weight: ${(props) => (props.$active ? "600" : "400")};
    color: ${(props) => (props.$active ? "#c9a03d" : "rgba(255, 255, 255, 0.75)")};
    background-color: ${(props) =>
      props.$active ? "rgba(201, 160, 61, 0.1)" : "transparent"};
    text-decoration: none;
    transition: background-color 0.15s ease;
    border-left: 3px solid
      ${(props) => (props.$active ? "#c9a03d" : "transparent")};

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

const Main = styled.main`
  flex: 1;
  overflow-x: hidden;
`;

const MainHeader = styled.div`
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitle = styled.h2`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: #0f172a;
  margin: 0;
`;

const HeaderBadge = styled.span`
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  color: #475569;
`;

const Content = styled.div`
  padding: 32px;
`;

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: "◉" },
  { path: "/admin/tenants", label: "Tenants", icon: "⊞" },
  { path: "/admin/logs", label: "Audit Logs", icon: "☰" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Layout>
      <Sidebar>
        <SidebarHeader>
          <SidebarTitle>KOMPASSI</SidebarTitle>
          <SidebarSubtitle>Admin Panel</SidebarSubtitle>
        </SidebarHeader>
        <NavList>
          {navItems.map((item) => (
            <NavItem key={item.path} $active={pathname === item.path}>
              <Link href={item.path}>
                <NavIcon>{item.icon}</NavIcon>
                {item.label}
              </Link>
            </NavItem>
          ))}
        </NavList>
      </Sidebar>
      <Main>
        <MainHeader>
          <HeaderTitle>
            {navItems.find((n) => n.path === pathname)?.label ?? "Admin"}
          </HeaderTitle>
          <HeaderBadge>v0.1.0</HeaderBadge>
        </MainHeader>
        <Content>{children}</Content>
      </Main>
    </Layout>
  );
}
