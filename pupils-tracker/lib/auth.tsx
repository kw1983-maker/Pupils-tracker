"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  auth,
  revokeOtherSessions,
  subscribeSessionRevocation,
} from "./firebase";

// Firebase Email/Password needs an email, but we want a plain-username login, so we
// map "teacher" -> "teacher@pupils-tracker.local". Create the matching account in the
// Firebase console with this exact email.
const AUTH_EMAIL_DOMAIN = "pupils-tracker.local";

// A random id for this browser, so "Log out other devices" can spare the
// device it was pressed on. In-memory fallback if storage is unavailable.
const DEVICE_ID_KEY = "pt-device-id";
let memoryDeviceId: string | null = null;
export function getDeviceId(): string {
  try {
    const saved = window.localStorage.getItem(DEVICE_ID_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    memoryDeviceId ??= Math.random().toString(36).slice(2);
    return memoryDeviceId;
  }
}

// Remove this device's saved copy of the class data (every store version).
function clearLocalData() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("pupil-tracker-")) window.localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable — nothing saved to clear */
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  // Phone linking: send a scanned one-time QR code, wait until the teacher
  // taps Allow on the computer (onWaiting fires once the request is in), then
  // sign in to the same account. Resolves null on success, else a message.
  loginWithLinkCode: (
    code: string,
    deviceName: string,
    onWaiting?: () => void
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  // Signs the account out on every other device (this one stays signed in).
  logoutOtherDevices: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Phone linking: how often the phone asks whether it was allowed, and how long
// it waits (a little past the server's two-minute window).
const LINK_POLL_MS = 2000;
const LINK_WAIT_MS = 2.5 * 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fires from local persistence first, so an already-signed-in user is restored
    // without a network round-trip (web persistence is local by default).
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Sign this device out when another device pressed "Log out other devices"
  // after this session signed in. Both times are Google server times, so a
  // wrong device clock can't break the check; a later sign-in is unaffected.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const unsub = subscribeSessionRevocation(
      user.uid,
      async ({ revokedAtMs, keepDeviceId }) => {
        if (keepDeviceId === getDeviceId()) return;
        const { authTime } = await user.getIdTokenResult();
        if (cancelled || revokedAtMs <= Date.parse(authTime)) return;
        await signOut(auth);
        clearLocalData();
      }
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [user]);

  const login = async (username: string, password: string): Promise<boolean> => {
    setError(null);
    const id = username.trim().toLowerCase();
    // Accept a full email as-is, or map a plain username to the synthetic domain.
    const email = id.includes("@") ? id : `${id}@${AUTH_EMAIL_DOMAIN}`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Check your connection and try again.");
      } else {
        setError("Incorrect username or password.");
      }
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Always show the account chooser, even when one Google session is active,
      // so the user can pick which account's data to load.
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      return true;
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      // User dismissing the popup isn't an error worth surfacing.
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return false;
      }
      if (code === "auth/network-request-failed") {
        setError("Network error. Check your connection and try again.");
      } else if (code === "auth/unauthorized-domain") {
        setError(
          "This domain isn't authorized for Google sign-in. Add it in the Firebase console."
        );
      } else {
        setError("Google sign-in failed. Please try again.");
      }
      return false;
    }
  };

  const loginWithLinkCode = async (
    code: string,
    deviceName: string,
    onWaiting?: () => void
  ): Promise<string | null> => {
    setError(null);
    const post = async (path: string, body: object) => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ticket?: string;
        token?: string;
        state?: string;
        message?: string;
      };
      return { res, data };
    };
    try {
      const claim = await post("/api/pair/claim", { code, deviceName });
      const ticket = claim.data.ticket;
      if (!claim.res.ok || !ticket) {
        return claim.data.message ?? "Linking failed. Try again.";
      }
      onWaiting?.();
      // Wait for Allow on the computer (the server gives up after 2 minutes).
      const giveUpAt = Date.now() + LINK_WAIT_MS;
      while (Date.now() < giveUpAt) {
        await new Promise((r) => setTimeout(r, LINK_POLL_MS));
        let step: Awaited<ReturnType<typeof post>>;
        try {
          step = await post("/api/pair/collect", { code, ticket });
        } catch {
          continue; // a dropped poll — try again
        }
        if (step.data.state === "pending") continue;
        if (step.data.token) {
          await signInWithCustomToken(auth, step.data.token);
          return null;
        }
        return step.data.message ?? "Linking failed. Try again.";
      }
      return "Nobody tapped Allow on the computer in time. Make a new code to try again.";
    } catch {
      return "Network error. Check your connection and try again.";
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const logoutOtherDevices = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      await revokeOtherSessions(user.uid, getDeviceId());
      return true;
    } catch (err) {
      console.error("Log out other devices failed:", err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        loginWithGoogle,
        loginWithLinkCode,
        logout,
        logoutOtherDevices,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
