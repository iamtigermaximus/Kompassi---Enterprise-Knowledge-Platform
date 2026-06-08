"use client";

import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background-color: #ffffff;
`;

const Content = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 640px;
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
  border: 3px solid #c9a03d;
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
    background: #c9a03d;
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
    background: #1e3a5f;
    top: 12px;
    left: 50%;
    transform: translateX(-50%) rotate(30deg);
    transform-origin: bottom center;
  }
`;

const AppName = styled.h1`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 32px;
  color: #0f172a;
  letter-spacing: 0.05em;
`;

const Tagline = styled.p`
  font-family: "Inter", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: #475569;
  margin-bottom: 48px;
  font-style: italic;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 6px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  font-family: "Inter", sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #c9a03d;
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #f8fafc;
  text-align: left;
`;

const FeatureTitle = styled.h3`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #0f172a;
  margin-bottom: 8px;
`;

const FeatureDescription = styled.p`
  font-family: "Inter", sans-serif;
  font-weight: 400;
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
`;

const StatusBar = styled.div`
  margin-top: 64px;
  padding: 12px 24px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  color: #059669;
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #059669;
  display: inline-block;
`;

export default function Home() {
  return (
    <Container>
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
