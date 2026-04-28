/**
 * Register Arabic (Tajawal) fonts for @react-pdf/renderer.
 * IMPORTANT: react-pdf only supports TTF/OTF — NOT woff2.
 * Call registerFonts() once before rendering any PDF document.
 */
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Tajawal",
    fonts: [
      { src: "/fonts/Tajawal-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/Tajawal-Bold.ttf",    fontWeight: 700 },
    ],
  });

  // Hyphenation callback — disable auto-hyphenation for Arabic
  Font.registerHyphenationCallback((word) => [word]);
}
