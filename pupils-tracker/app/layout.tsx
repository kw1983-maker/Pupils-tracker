import type { Metadata } from "next";
import { Fraunces, Nunito, Caveat } from "next/font/google";
import localFont from "next/font/local";
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
  weight: ["400", "500", "600", "700", "800"],
});

// Handwriting/marker face for the Spelling-Dictation board (mimics the whiteboard).
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Round display face for the Spelling board day/date + typed text
// (source: docs/References/Barley Round font/).
const barleyRound = localFont({
  src: [
    { path: "./fonts/round/BarleyRound-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/round/BarleyRound-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-barley-round",
  display: "swap",
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
      className={`${fraunces.variable} ${nunito.variable} ${caveat.variable} ${barleyRound.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper-50 font-sans text-paper-800">
        {children}
      </body>
    </html>
  );
}
