// KOMPASSI - Admin Auth Guard
// Wrap any admin page with this. Redirects to /login if not authenticated.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";

interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
}

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  font-family: var(--font);
  font-size: 14px;
  color: var(--text-secondary);
`;

export function useAdminSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { loading } = useAdminSession();

  if (loading) {
    return <LoadingContainer>Checking authentication...</LoadingContainer>;
  }

  return <>{children}</>;
}
