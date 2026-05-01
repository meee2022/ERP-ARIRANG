import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import LanguageSync from "@/components/LanguageSync";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShellGuard } from "@/components/auth/AppShellGuard";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: { default: "Arirang Bakery ERP", template: "%s | Arirang Bakery" },
  description: "Arirang Bakery \u2014 \u0646\u0638\u0627\u0645 \u0645\u062d\u0627\u0633\u0628\u0629 \u0648\u062a\u0648\u0632\u064a\u0639 | Accounting & Distribution ERP",
  keywords: ["Arirang Bakery", "ERP", "accounting", "distribution", "Qatar", "\u0645\u062d\u0627\u0633\u0628\u0629", "\u0645\u062e\u0628\u0632"],
  authors: [{ name: "Arirang Bakery" }],
  creator: "Arirang Bakery",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png" }],
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "Arirang Bakery ERP",
    description: "Arirang Bakery \u2014 \u0646\u0638\u0627\u0645 \u0645\u062d\u0627\u0633\u0628\u0629 \u0648\u062a\u0648\u0632\u064a\u0639 | Accounting & Distribution ERP",
    siteName: "Arirang Bakery ERP",
    url: "https://erp-arirang.vercel.app",
    type: "website",
    locale: "ar_QA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arirang Bakery ERP",
    description: "Arirang Bakery \u2014 Accounting & Distribution ERP",
  },
  robots: { index: false, follow: false },
  metadataBase: new URL("https://erp-arirang.vercel.app"),
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
