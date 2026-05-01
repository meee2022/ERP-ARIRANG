"use client";

import { useToastStore } from "@/store/toastStore";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

const META = {
  success: {
    icon: CheckCircle2,
    bar: "bg-green-500",
    wrap: "bg-white border-green-200",
    icon_color: "text-green-600",
    text: "text-gray-900",
  },
  error: {
    icon: AlertCircle,
    bar: "bg-red-500",
    wrap: "bg-white border-red-200",
    icon_color: "text-red-600",
    text: "text-gray-900",
  },
  warning: {
    icon: AlertTriangle,
    bar: "bg-amber-400",
    wrap: "bg-white border-amber-200",
    icon_color: "text-amber-500",
    text: "text-gray-900",
  },
  info: {
    icon: Info,
    bar: "bg-blue-500",
    wrap: "bg-white border-blue-200",
    icon_color: "text-blue-600",
    text: "text-gray-900",
  },
};

function ToastItem({ toast, onRemove }: { toast: any; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);
  const m = META[toast.type as keyof typeof META];
  const Icon = m.icon;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`relative flex items-start gap-3 rounded-xl border shadow-[0_4px_20px_rgba(0,0,0,0.12)] px-4 py-3.5 max-w-sm w-full overflow-hidden transition-all duration-300 ${m.wrap} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      {/* Left accent bar */}
      <div className={`absolute start-0 top-0 bottom-0 w-1 rounded-s-xl ${m.bar}`} />

      <Icon className={`h-4.5 w-4.5 shrink-0 mt-0.5 ms-1 ${m.icon_color}`} style={{ width: 18, height: 18 }} />

      <p className={`flex-1 text-[13px] font-medium leading-snug break-words ${m.text}`}>
        {toast.message}
      </p>

      <button
        onClick={onRemove}
        className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed top-4 end-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => remove(t.id)} />
        </div>
      ))}
    </div>
  );
}
