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
function getDeviceId(): string {
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
  logout: () => Promise<void>;
  // Signs the account out on every other device (this one stays signed in).
  logoutOtherDevices: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
