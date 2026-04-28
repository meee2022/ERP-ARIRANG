"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./header";
import { useAppStore } from "@/store/useAppStore";
import { useI18n } from "@/hooks/useI18n";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen    = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const { isRTL }      = useI18n();

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
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden surface-base relative">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Icon Rail — always 76px wide */}
      <div
        className="shrink-0 z-50 fixed inset-y-0 lg:sticky lg:top-0 lg:h-screen"
        style={{
          width: 76,
          [isRTL ? "right" : "left"]: 0,
        }}
      >
        {/* On mobile, slide in/out; on desktop: always visible */}
        <div
          className="h-full lg:!transform-none"
          style={{
            transform: sidebarOpen ? "translateX(0)" : isRTL ? "translateX(100%)" : "translateX(-100%)",
            transition: "transform 0.3s ease-out",
          }}
        >
          <Sidebar />
        </div>
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