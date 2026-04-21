"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  return (
    <div className="flex h-screen w-full overflow-hidden surface-base">
      <div
        className={cn(
          "shrink-0 transition-[width] duration-300 ease-out",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
