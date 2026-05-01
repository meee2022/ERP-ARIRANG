"use client";

import { Sidebar, MobileBottomNav } from "./Sidebar";
import { Header } from "./header";
import { Toaster } from "@/components/ui/toaster";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full surface-base">

      {/* Icon Rail — desktop only, always visible */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen" style={{ width: 76 }}>
        <Sidebar />
      </div>

      <Toaster />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        {/* pb-14 on mobile leaves space above the bottom nav bar */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-14 lg:pb-0">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation — hidden on desktop via lg:hidden inside component */}
      <MobileBottomNav />
    </div>
  );
}
