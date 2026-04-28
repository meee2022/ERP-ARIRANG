// @ts-nocheck
"use client";
/**
 * Generic PDF download button.
 * Wraps PDFDownloadLink from @react-pdf/renderer with a dynamic import
 * to avoid SSR issues (react-pdf is client-only).
 */
import React, { Suspense, lazy } from "react";
import { FileDown } from "lucide-react";

// Lazy-load PDFDownloadLink so it never runs on the server
const PDFDownloadLink = lazy(() =>
  import("@react-pdf/renderer").then((m) => ({ default: m.PDFDownloadLink }))
);

interface PdfDownloadButtonProps {
  document: React.ReactElement;
  fileName: string;
  label?: string;
}

export function PdfDownloadButton({ document, fileName, label = "PDF" }: PdfDownloadButtonProps) {
  return (
    <Suspense
      fallback={
        <button disabled className="h-9 px-4 rounded-lg bg-gray-100 text-gray-400 text-sm font-semibold flex items-center gap-2 cursor-not-allowed">
          <FileDown className="h-4 w-4" />
          {label}
        </button>
      }
    >
      <PDFDownloadLink document={document} fileName={fileName}>
        {({ loading }) => (
          <button className="h-9 px-4 rounded-lg bg-purple-700 text-white text-sm font-semibold flex items-center gap-2 hover:bg-purple-800 transition-colors disabled:opacity-50">
            <FileDown className="h-4 w-4" />
            {loading ? "..." : label}
          </button>
        )}
      </PDFDownloadLink>
    </Suspense>
  );
}
