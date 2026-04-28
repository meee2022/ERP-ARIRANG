import { StyleSheet } from "@react-pdf/renderer";

export const BRAND = "#1d4ed8"; // matches --brand-700
export const INK   = "#1e293b";

export const base = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    fontSize: 10,
    color: INK,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    backgroundColor: "#fff",
  },
  // ── Header strip ──────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#1e293b",
    paddingBottom: 10,
    marginBottom: 14,
  },
  companyName: { fontSize: 13, fontWeight: 700, color: INK },
  companyMeta: { fontSize: 8,  color: "#64748b", marginTop: 2 },
  docTitle:    { fontSize: 16, fontWeight: 700, color: BRAND },
  docNumber:   { fontSize: 11, fontWeight: 700, color: INK,   marginTop: 3 },
  docDate:     { fontSize: 9,  color: "#64748b",               marginTop: 2 },
  // ── Info grid ──────────────────────────────────────────────────────────────
  infoGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 7, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2, letterSpacing: 0.5 },
  infoValue: { fontSize: 10, fontWeight: 700, color: INK },
  infoSub:   { fontSize: 8,  color: "#64748b", marginTop: 2 },
  // ── Table ─────────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1.5,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 6,
    minHeight: 20,
  },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  thText: { fontSize: 8, fontWeight: 700, color: "#475569" },
  tdText: { fontSize: 9,  color: INK },
  // ── Totals block ──────────────────────────────────────────────────────────
  totalsBlock: { marginTop: 8, marginBottom: 16 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 200, marginTop: 3 },
  totalsLabel: { fontSize: 9, color: "#64748b" },
  totalsValue: { fontSize: 9, fontWeight: 700, color: INK },
  totalsFinal: {
    flexDirection: "row", justifyContent: "space-between", width: 200,
    borderTopWidth: 1.5, borderTopColor: INK, marginTop: 6, paddingTop: 5,
  },
  totalsFinalLabel: { fontSize: 11, fontWeight: 700, color: INK },
  totalsFinalValue: { fontSize: 11, fontWeight: 700, color: INK },
  // ── Signature strip ────────────────────────────────────────────────────────
  sigStrip: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 0.5, borderTopColor: "#cbd5e1",
    marginTop: 24, paddingTop: 10,
  },
  sigBox: { flex: 1, alignItems: "center" },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: "#94a3b8", width: "80%", marginBottom: 4 },
  sigLabel: { fontSize: 8, color: "#64748b" },
  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#94a3b8" },
  // ── Status badge ──────────────────────────────────────────────────────────
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, alignSelf: "flex-start",
  },
  badgeText: { fontSize: 8, fontWeight: 700 },
});

/** Column width helpers — values in pt */
export const COL = {
  idx:   24,
  code:  52,
  name:  "auto" as const,
  qty:   36,
  price: 52,
  total: 60,
};

/** Status → badge colours */
export function badgeColors(status: string) {
  switch (status) {
    case "posted":   return { bg: "#dcfce7", fg: "#166534" };
    case "reversed": return { bg: "#fef2f2", fg: "#991b1b" };
    case "approved": return { bg: "#fefce8", fg: "#854d0e" };
    default:         return { bg: "#f1f5f9", fg: "#475569" };
  }
}

/** RTL helpers — flip flexDirection and text alignment */
export function rowDir(isRTL: boolean): "row" | "row-reverse" {
  return isRTL ? "row-reverse" : "row";
}
export function textStart(isRTL: boolean): "right" | "left" {
  return isRTL ? "right" : "left";
}
export function textEnd(isRTL: boolean): "right" | "left" {
  return isRTL ? "left" : "right";
}
export function alignStart(isRTL: boolean): "flex-end" | "flex-start" {
  return isRTL ? "flex-end" : "flex-start";
}
export function alignEnd(isRTL: boolean): "flex-end" | "flex-start" {
  return isRTL ? "flex-start" : "flex-end";
}
