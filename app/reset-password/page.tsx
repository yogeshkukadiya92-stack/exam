"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (active && data.session) {
        setReady(true);
        setChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: unknown) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          setReady(true);
          setChecking(false);
        }
      }
    );

    const timeout = window.setTimeout(() => {
      if (active) setChecking(false);
    }, 4000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push("/login?message=" + encodeURIComponent("Password updated successfully! Please sign in."));
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200">
            <span className="text-lg font-bold text-white">E</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">New Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ready
              ? "Enter your new password below"
              : checking
                ? "Verifying your reset link..."
                : "This reset link is invalid or has expired"}
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {checking ? (
            <div className="py-8 text-center">
              <div
                className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"
                role="status"
                aria-label="Verifying reset link"
              />
              <p className="mt-4 text-sm text-slate-500">
                Please wait while we verify your reset link...
              </p>
            </div>
          ) : ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  className="input"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Request a new password reset email and open the latest link.
              </p>
              <Link href="/forgot-password" className="btn-primary mt-5 inline-flex">
                Request new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
