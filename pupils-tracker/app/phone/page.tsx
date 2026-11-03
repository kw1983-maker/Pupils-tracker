"use client";

import { AuthProvider, useAuth } from "@/lib/auth";
import { TrackerProvider } from "@/lib/store";
import { RemoteProvider } from "@/lib/remote";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { CelebrationProvider } from "@/components/ui/Celebration";
import { LoginScreen } from "@/components/ui/LoginScreen";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { PhoneLinkScreen } from "@/components/phone/PhoneLinkScreen";
import { isNativeApp } from "@/lib/native";

// The phone companion (also what the Android app opens). Same account, data
// and sync as the main page — just phone-sized screens for the teacher.
function PhoneGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <p className="text-sm text-paper-400">Loading…</p>
      </main>
    );
  }
  // Google's sign-in popup can't open inside the Android app, so there the
  // QR link from the web app is how the phone signs in.
  if (!user) return isNativeApp() ? <PhoneLinkScreen /> : <LoginScreen />;
  return (
    <TrackerProvider>
      <RemoteProvider>
        <ConfirmProvider>
          <CelebrationProvider>
            <PhoneShell />
          </CelebrationProvider>
        </ConfirmProvider>
      </RemoteProvider>
    </TrackerProvider>
  );
}

export default function PhonePage() {
  return (
    <AuthProvider>
      <PhoneGate />
    </AuthProvider>
  );
}
