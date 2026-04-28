import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
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
          padding: "48px 32px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "#eff6ff", display: "flex",
            alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <FileQuestion style={{ color: "#2563eb", width: "36px", height: "36px" }} />
        </div>
        <p style={{ fontSize: "48px", fontWeight: 800, color: "#1e3a8a", margin: "0 0 8px" }}>
          404
        </p>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
          الصفحة غير موجودة
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "28px" }}>
          الرابط الذي طلبته غير موجود أو تم نقله.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "10px 28px", borderRadius: "10px",
            background: "#2563eb", color: "#fff",
            fontSize: "14px", fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <Home style={{ width: "16px", height: "16px" }} />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
