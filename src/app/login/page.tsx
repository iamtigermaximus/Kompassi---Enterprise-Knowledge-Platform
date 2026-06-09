// KOMPASSI - Login Page
// Email/password login form. Authenticates via /api/auth/login, then redirects to admin.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";

// ─── Styled Components ───────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background-color: var(--bg-secondary);
  font-family: var(--font);
`;

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
`;

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const CompassIcon = styled.div`
  width: 36px;
  height: 36px;
  border: 2px solid var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;

  &::after {
    content: "";
    position: absolute;
    width: 2px;
    height: 16px;
    background: var(--primary);
    top: 6px;
    left: 50%;
    transform: translateX(-50%) rotate(-30deg);
    transform-origin: bottom center;
  }

  &::before {
    content: "";
    position: absolute;
    width: 2px;
    height: 12px;
    background: var(--secondary);
    top: 8px;
    left: 50%;
    transform: translateX(-50%) rotate(30deg);
    transform-origin: bottom center;
  }
`;

const AppName = styled.h1`
  font-family: var(--font);
  font-weight: 600;
  font-size: 22px;
  color: var(--text);
  letter-spacing: 0.04em;
  margin: 0;
`;

const Subtitle = styled.p`
  font-family: var(--font);
  font-weight: 400;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-family: var(--font);
  font-weight: 600;
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Input = styled.input`
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  background-color: var(--bg);
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  background-color: var(--secondary);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-family: var(--font);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
  margin-top: 8px;

  &:hover:not(:disabled) {
    background-color: var(--secondary-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMsg = styled.div`
  padding: 10px 14px;
  background-color: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--error);
`;

const ThemeToggle = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--bg);
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--primary);
  }
`;

const Footer = styled.p`
  font-family: var(--font);
  font-weight: 400;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 24px;
`;

const BackLink = styled.a`
  color: var(--primary);
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

// ─── Component ────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kompassi-theme");
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  // Check if already logged in
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          const dest =
            data.user.role === "SUPERADMIN"
              ? "/admin/dashboard"
              : "/workspace";
          router.replace(dest);
        }
      })
      .catch(() => {});
  }, [router]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("kompassi-theme", next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }

      const dest = data.user?.role === "SUPERADMIN"
        ? "/admin/dashboard"
        : "/workspace";
      router.replace(dest);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Container>
      <ThemeToggle onClick={toggleTheme} title="Toggle theme">
        {theme === "dark" ? "☀️" : "🌙"}
      </ThemeToggle>

      <Card>
        <LogoArea>
          <CompassIcon />
          <AppName>KOMPASSI</AppName>
        </LogoArea>
        <Subtitle>Sign in to the admin panel</Subtitle>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMsg>{error}</ErrorMsg>}

          <FieldGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </FieldGroup>

          <Button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </Form>

        <Footer>
          <BackLink
            onClick={(e) => {
              e.preventDefault();
              router.push("/");
            }}
          >
            &larr; Back to home
          </BackLink>
        </Footer>
      </Card>
    </Container>
  );
}
