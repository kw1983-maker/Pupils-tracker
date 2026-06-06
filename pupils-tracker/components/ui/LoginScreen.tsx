"use client";

import { useState } from "react";
import { GraduationCap, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "./Button";
import { Field, fieldClassName } from "./Field";

export function LoginScreen() {
  const { login, loginWithGoogle, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || submitting) return;
    setSubmitting(true);
    await login(username, password);
    setSubmitting(false);
  };

  const submitGoogle = async () => {
    if (submitting) return;
    setSubmitting(true);
    await loginWithGoogle();
    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 p-4">
      <div className="card w-full max-w-sm rounded-card p-7 shadow-float">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-surface">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-paper-900">
            ClassTrack <span className="text-brand-600">Pro</span>
          </h1>
          <p className="text-sm text-paper-500">Sign in to continue</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Username or email" htmlFor="login-username">
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className={`w-full ${fieldClassName}`}
            />
          </Field>

          <Field label="Password" htmlFor="login-password">
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full ${fieldClassName}`}
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            <LogIn className="h-4 w-4" />
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-paper-200" />
          </div>
          <div className="relative flex justify-center text-xs font-bold uppercase">
            <span className="bg-surface px-3 text-paper-400">Or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={submitGoogle}
          disabled={submitting}
        >
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </Button>
      </div>
    </main>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
