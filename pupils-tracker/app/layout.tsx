import type { Metadata } from "next";
import { Fraunces, Nunito, Caveat } from "next/font/google";
import "./globals.css";

// Display & numerals — soft, characterful serif (see docs/design/style-guide.md).
// Omit `weight` to load the full variable range so the `opsz` (optical sizing)
// axis can be enabled; `font-optical-sizing: auto` (globals.css) then acts on it.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

// UI & body — rounded humanist sans, legible at 12–14px
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

// Handwriting/marker face for the Spelling-Dictation board (mimics the whiteboard).
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "ClassTrack — Pupil Tracker",
  description:
    "Track pupil homework, attendance, behavior and performance across your class.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${nunito.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper-50 font-sans text-paper-800">
        {children}
      </body>
    </html>
  );
}
