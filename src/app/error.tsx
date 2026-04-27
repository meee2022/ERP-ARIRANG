"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PrimeBalance page-error]", {
      timestamp: new Date().toISOString(),
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "'IBM Plex Sans Arabic', 'Inter', sans-serif",
        padding: "24px",
      }}
      dir="rtl"
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          padding: "40px 32px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "#fef2f2", display: "flex",
            alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <AlertTriangle style={{ color: "#ef4444", width: "28px", height: "28px" }} />
        </div>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
          خطأ في تحميل الصفحة
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
          تعذّر تحميل هذه الصفحة. يُرجى المحاولة مرة أخرى.
        </p>
        <button
          onClick={reset}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "10px 24px", borderRadius: "10px",
            background: "#2563eb", color: "#fff",
            fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer",
          }}
        >
          <RefreshCw style={{ width: "16px", height: "16px" }} />
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
