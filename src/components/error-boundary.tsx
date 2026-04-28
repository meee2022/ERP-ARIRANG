"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const IS_DEV = process.env.NODE_ENV !== "production";

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Structured log — visible in Vercel Functions / Convex logs
    console.error("[PrimeBalance]", {
      timestamp: new Date().toISOString(),
      message: error.message,
      name: error.name,
      // Stack only in dev — avoid leaking internals in production
      ...(IS_DEV && { stack: error.stack, componentStack: errorInfo.componentStack }),
    });
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const errorMessage = this.state.error?.message ?? "";

    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: "24px",
          fontFamily: "'IBM Plex Sans Arabic', 'Inter', sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
            padding: "40px 32px",
            maxWidth: "480px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "#fef2f2", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <AlertTriangle style={{ color: "#ef4444", width: "32px", height: "32px" }} />
          </div>

          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>
            نأسف، واجه التطبيق مشكلة. يُرجى المحاولة مرة أخرى.
          </p>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#374151", marginTop: "20px", marginBottom: "6px", direction: "ltr" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "8px", direction: "ltr" }}>
            An unexpected error occurred. Please try again or return home.
          </p>

          {/* Show error detail only in development */}
          {IS_DEV && errorMessage && (
            <details
              style={{
                margin: "16px 0", textAlign: "start",
                background: "#fef2f2", borderRadius: "8px",
                padding: "10px 14px", fontSize: "12px", color: "#b91c1c", cursor: "pointer",
              }}
            >
              <summary style={{ fontWeight: 600, marginBottom: "6px", direction: "ltr" }}>
                Error details (dev only)
              </summary>
              <code style={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word", direction: "ltr" }}>
                {errorMessage}
              </code>
            </details>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
            <button
              onClick={this.handleTryAgain}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "10px 20px", borderRadius: "10px",
                background: "#2563eb", color: "#ffffff",
                fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer",
              }}
            >
              <RefreshCw style={{ width: "16px", height: "16px" }} />
              <span>إعادة المحاولة / Try Again</span>
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "10px 20px", borderRadius: "10px",
                background: "#f3f4f6", color: "#374151",
                fontSize: "14px", fontWeight: 600,
                border: "1px solid #e5e7eb", cursor: "pointer",
              }}
            >
              <Home style={{ width: "16px", height: "16px" }} />
              <span>الرئيسية / Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
