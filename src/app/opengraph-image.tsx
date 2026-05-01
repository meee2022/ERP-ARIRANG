import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Arirang Bakery ERP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6b1523 0%, #9b1f30 60%, #4a0e18 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo circle */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 32,
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://erp-arirang.vercel.app/logo.png"
            alt=""
            width={130}
            height={130}
            style={{ borderRadius: 24, objectFit: "contain" }}
          />
        </div>

        <div
          style={{
            color: "white",
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: -1,
            marginBottom: 12,
          }}
        >
          Arirang Bakery
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: 1,
          }}
        >
          Accounting &amp; Distribution ERP
        </div>
      </div>
    ),
    { ...size }
  );
}
