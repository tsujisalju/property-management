"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, confirmSignUp } from "@/lib/auth";
import Link from "next/link";

type Step = "form" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsPending(true);
    try {
      await signUp(email, password, fullName);
      setStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await confirmSignUp(email, code);
      router.push("/login?registered=true");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
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
              {step === "form" ? "Create a new account" : "Verify your email"}
            </p>
          </div>

          {step === "form" ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Full Name</legend>
                <input
                  type="text"
                  required
                  className="input input-bordered w-full"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isPending}
                />
              </fieldset>

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
                  minLength={8}
                  className="input input-bordered w-full"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Confirm Password</legend>
                <input
                  type="password"
                  required
                  className="input input-bordered w-full"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  "Create account"
                )}
              </button>

              <p className="text-sm text-center text-base-content/60">
                Already have an account?{" "}
                <Link href="/login" className="link link-neutral">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-3">
              <p className="text-sm text-base-content/70">
                We sent a 6-digit code to <strong>{email}</strong>. Enter it
                below to verify your account.
              </p>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Verification Code</legend>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  className="input input-bordered w-full tracking-widest text-center text-lg"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
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
                disabled={isPending || code.length !== 6}
              >
                {isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Verify"
                )}
              </button>

              <p className="text-sm text-center text-base-content/60">
                Wrong email?{" "}
                <button
                  type="button"
                  className="link link-neutral"
                  onClick={() => { setStep("form"); setError(null); setCode(""); }}
                >
                  Go back
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
