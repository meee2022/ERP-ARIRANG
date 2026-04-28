import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import LanguageSync from "@/components/LanguageSync";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShellGuard } from "@/components/auth/AppShellGuard";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "PrimeBalance ERP",
  description: "Accounting & Distribution ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased surface-base" suppressHydrationWarning>
        <ErrorBoundary>
          <ConvexClientProvider>
            <AuthProvider>
              <LanguageSync />
              <AppShellGuard>{children}</AppShellGuard>
            </AuthProvider>
          </ConvexClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
