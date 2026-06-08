"use client";

import styled from "styled-components";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background-color: var(--bg);
`;

const NavBar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: var(--bg);
  border-bottom: 1px solid var(--border);

  @media (max-width: 480px) {
    padding: 12px 16px;
  }
`;

const NavBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavCompass = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid var(--primary);
  border-radius: 50%;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    width: 2px;
    height: 11px;
    background: var(--primary);
    top: 4px;
    left: 50%;
    transform: translateX(-50%) rotate(-30deg);
    transform-origin: bottom center;
  }

  &::before {
    content: "";
    position: absolute;
    width: 2px;
    height: 8px;
    background: var(--secondary);
    top: 5px;
    left: 50%;
    transform: translateX(-50%) rotate(30deg);
    transform-origin: bottom center;
  }
`;

const NavName = styled.span`
  font-family: var(--font);
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  letter-spacing: 0.04em;
`;

const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
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

  &:hover {
    border-color: var(--primary);
  }
`;

const LoginLink = styled.a`
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--font);
  font-weight: 500;
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
`;

const Content = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 640px;
  margin-top: 60px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
`;

const CompassIcon = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    width: 3px;
    height: 24px;
    background: var(--primary);
    top: 9px;
    left: 50%;
    transform: translateX(-50%) rotate(-30deg);
    transform-origin: bottom center;
  }

  &::before {
    content: "";
    position: absolute;
    width: 3px;
    height: 18px;
    background: var(--secondary);
    top: 12px;
    left: 50%;
    transform: translateX(-50%) rotate(30deg);
    transform-origin: bottom center;
  }
`;

const AppName = styled.h1`
  font-family: var(--font);
  font-weight: 600;
  font-size: 32px;
  color: var(--text);
  letter-spacing: 0.05em;

  @media (max-width: 480px) {
    font-size: 24px;
  }
`;

const Tagline = styled.p`
  font-family: var(--font);
  font-weight: 400;
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 48px;
  font-style: italic;

  @media (max-width: 480px) {
    font-size: 15px;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 24px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  margin-top: 32px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.div`
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg-secondary);
  text-align: left;
`;

const FeatureTitle = styled.h3`
  font-family: var(--font);
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 8px;
`;

const FeatureDescription = styled.p`
  font-family: var(--font);
  font-weight: 400;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
`;

const StatusBar = styled.div`
  margin-top: 64px;
  padding: 12px 24px;
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--success);
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--success);
  display: inline-block;
`;

export default function Home() {
  const { theme, toggle } = useTheme();

  return (
    <Container>
      <NavBar>
        <NavBrand>
          <NavCompass />
          <NavName>KOMPASSI</NavName>
        </NavBrand>
        <NavActions>
          <ThemeToggleBtn onClick={toggle} title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </ThemeToggleBtn>
          <Link href="/login" passHref legacyBehavior>
            <LoginLink>Sign In</LoginLink>
          </Link>
        </NavActions>
      </NavBar>

      <Content>
        <Logo>
          <CompassIcon />
          <AppName>KOMPASSI</AppName>
        </Logo>

        <Tagline>&ldquo;Navigate your knowledge&rdquo;</Tagline>

        <Badge>Enterprise Knowledge Platform</Badge>

        <FeatureGrid>
          <FeatureCard>
            <FeatureTitle>Multi-Tenancy</FeatureTitle>
            <FeatureDescription>
              Isolated data per customer with Row-Level Security. No
              cross-contamination between tenants.
            </FeatureDescription>
          </FeatureCard>
          <FeatureCard>
            <FeatureTitle>Rate Limiting</FeatureTitle>
            <FeatureDescription>
              Per-tenant limits based on plan tier. Free, Pro, and Enterprise
              levels with configurable quotas.
            </FeatureDescription>
          </FeatureCard>
          <FeatureCard>
            <FeatureTitle>Cost Tracking</FeatureTitle>
            <FeatureDescription>
              Track tokens and cost per query. Daily aggregates per tenant with
              real-time monitoring.
            </FeatureDescription>
          </FeatureCard>
          <FeatureCard>
            <FeatureTitle>RAG Engine</FeatureTitle>
            <FeatureDescription>
              Upload PDFs, vector search filtered by tenant, DeepSeek-powered
              answers with citations.
            </FeatureDescription>
          </FeatureCard>
        </FeatureGrid>

        <StatusBar>
          <StatusDot />
          System ready &mdash; v0.1.0
        </StatusBar>
      </Content>
    </Container>
  );
}
