import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function parseConvexError(e: any): string {
  const raw: string = e?.message || String(e);
  const match = raw.match(/Uncaught Error: (.+?)(?:\n|Consider|$)/s);
  if (match) return match[1].trim();
  const lines = raw.split("\n").filter((l: string) => l.trim());
  const useful = lines.find(
    (l: string) =>
      !l.startsWith("[CONVEX") &&
      !l.startsWith("Server Error") &&
      !l.startsWith("Uncaught")
  );
  return useful ?? lines[0] ?? raw;
}

export const toast = {
  success: (msg: string) => useToastStore.getState().add("success", msg),
  error: (e: unknown) => {
    const msg = e instanceof Error || (e && typeof e === "object" && "message" in e)
      ? parseConvexError(e)
      : String(e);
    useToastStore.getState().add("error", msg);
  },
  info: (msg: string) => useToastStore.getState().add("info", msg),
  warning: (msg: string) => useToastStore.getState().add("warning", msg),
};
