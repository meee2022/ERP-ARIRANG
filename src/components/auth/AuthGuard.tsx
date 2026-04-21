"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Show spinner while session is being validated
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full" />
          <p className="text-sm text-[color:var(--ink-500)]">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  // On login page — always render (no guard)
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Not authenticated and not yet redirected — show nothing briefly
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
