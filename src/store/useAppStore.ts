import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Language } from "@/lib/i18n";

interface AppState {
  selectedBranch: string;
  selectedMonth: number;
  selectedYear: number;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  language: Language;
  setSelectedBranch: (branch: string) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedBranch: "all",
      selectedMonth: new Date().getMonth() + 1,
      selectedYear: new Date().getFullYear(),
      sidebarOpen: true,
      sidebarCollapsed: false,
      language: "ar",

      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      setSelectedYear: (year) => set({ selectedYear: year }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setLanguage: (lang) => set({ language: lang }),
      toggleLanguage: () =>
        set((state) => ({ language: state.language === "ar" ? "en" : "ar" })),
    }),
    {
      name: "erp-app-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields across refresh
      partialize: (state) => ({
        language: state.language,
        selectedBranch: state.selectedBranch,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
