"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./header";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const { isRTL } = useI18n();

  // On mobile, close sidebar on initial load
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (window.innerWidth < 1024 && sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden surface-base relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "shrink-0 transition-transform duration-300 ease-out z-50",
          "fixed inset-y-0 lg:relative",
          isRTL ? "right-0" : "left-0",
          sidebarOpen 
            ? "translate-x-0" 
            : (isRTL ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"),
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 w-full lg:w-auto">
        <Header />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
