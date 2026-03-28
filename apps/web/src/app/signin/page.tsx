"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Panel } from "@/components/ui/panel";

export default function SignInPage() {
  const { loginWithDevEmail, user } = useAuth();
  const [devEmail, setDevEmail] = useState("admin@altf.example");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard/payments");
    }
  }, [router, user]);

  const handleDev = async () => {
    try {
      setBusy(true);
      setError(null);
      await loginWithDevEmail(devEmail);
      router.replace("/dashboard/payments");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-dashboard-grid px-4 py-8">
      <div className="mx-auto grid min-h-[90vh] max-w-6xl items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2.5rem] bg-ink px-8 py-12 text-white shadow-panel lg:px-12">
          <p className="text-xs uppercase tracking-[0.26em] text-white/60">
            AltF Finance OS
          </p>
          <h1 className="mt-6 max-w-xl font-[var(--font-space)] text-5xl font-semibold leading-tight">
            Replace spreadsheet chasing with a live finance command center.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-white/72">
            Track receivables, push four-level expense approvals, sync with Zoho, and
            keep finance, ops, and approvers working from the same real-time ledger.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <ShieldCheck className="h-5 w-5 text-mint" />
              <p className="mt-4 text-lg font-semibold">Audit-ready flows</p>
              <p className="mt-2 text-sm text-white/65">
                Approval trails, batch imports, and status changes are all recorded.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <LockKeyhole className="h-5 w-5 text-mint" />
              <p className="mt-4 text-lg font-semibold">Role-based access</p>
              <p className="mt-2 text-sm text-white/65">
                Separate views for admin, approvers, and finance operators.
              </p>
            </div>
          </div>
        </section>

        <Panel className="mx-auto w-full max-w-xl rounded-[2.25rem] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dusk">
            Secure sign-in
          </p>
          <h2 className="mt-3 font-[var(--font-space)] text-3xl font-semibold text-ink">
            Enter the finance workspace
          </h2>
          <p className="mt-3 text-sm text-dusk">
            Sign in with a developer email for now.
          </p>

          <div className="mt-8 space-y-4">
            <>
              <input
                value={devEmail}
                onChange={(event) => setDevEmail(event.target.value)}
                placeholder="admin@altf.example"
              />
              <button
                type="button"
                onClick={() => void handleDev()}
                disabled={busy}
                className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
              >
                {busy ? "Signing in..." : "Continue with Developer Email"}
              </button>
            </>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

