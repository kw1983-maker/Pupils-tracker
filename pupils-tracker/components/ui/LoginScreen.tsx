"use client";

import { useState } from "react";
import { GraduationCap, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "./Button";
import { Field, fieldClassName } from "./Field";

export function LoginScreen() {
  const { login, error } = useAuth();
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
      </div>
    </main>
  );
}
