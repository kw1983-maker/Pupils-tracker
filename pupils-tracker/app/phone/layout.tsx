import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ClassTrack — Phone",
  description: "Pocket companion for the Pupil Tracker: points, roll call, photos and reminders.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function PhoneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
