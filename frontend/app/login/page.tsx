"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

function RegisteredBanner() {
  const searchParams = useSearchParams();
  if (!searchParams.get("registered")) return null;
  return (
    <div className="alert alert-success text-sm py-2">
      <span>Account created! Sign in to continue.</span>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-8">
      <div className="card w-full max-w-sm bg-base-100 shadow-md">
        <div className="card-body gap-4">
          <div>
            <h1 className="card-title text-xl">Property Management</h1>
            <p className="text-sm text-base-content/60 mt-1">
              Sign in to your account
            </p>
          </div>

          <Suspense>
            <RegisteredBanner />
          </Suspense>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Email</legend>
              <input
                type="email"
                required
                className="input input-bordered w-full"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Password</legend>
              <input
                type="password"
                required
                className="input input-bordered w-full"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
              />
            </fieldset>

            {error && (
              <div className="alert alert-error text-sm py-2">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-neutral w-full mt-1"
              disabled={isPending}
            >
              {isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Sign in"
              )}
            </button>

            <p className="text-sm text-center text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="link link-neutral">
                Register
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
