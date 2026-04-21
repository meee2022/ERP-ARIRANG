"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/app-shell";

export function AppShellGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace("/login");
    }
    if (!isLoading && isAuthenticated && isLoginPage) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  // Show spinner while session is being validated (not on login page)
  if (isLoading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full" />
          <p className="text-sm text-[color:var(--ink-500)]">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  // Login page — render without AppShell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Not authenticated yet — show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated — render with AppShell (sidebar + header)
  return <AppShell>{children}</AppShell>;
}
