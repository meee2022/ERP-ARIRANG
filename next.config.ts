import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript errors are caught by our pre-build `tsc --noEmit` step.
    // Keeping this true avoids duplicate type-check time during build.
    ignoreBuildErrors: true,
  },

  // Silence lockfile warning when the monorepo root has its own package-lock.json
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
