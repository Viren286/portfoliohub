"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Alert, Spinner } from "@/components/form-bits";

function SocialButtons({ providers }: { providers: string[] }) {
  if (!providers.length) return null;
  return (
    <div className="space-y-2.5">
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          className="btn-ghost w-full py-3"
          onClick={() => authClient.signIn.social({ provider: p as "google" | "github", callbackURL: "/dashboard" })}
        >
          Continue with {p === "google" ? "Google" : "GitHub"}
        </button>
      ))}
      <div className="flex items-center gap-3 py-2 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

export function SignUpForm({ providers }: { providers: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await authClient.signUp.email({
      name: String(f.get("name")).trim(),
      email: String(f.get("email")).trim(),
      password: String(f.get("password")),
      callbackURL: "/dashboard",
    });
    setBusy(false);
    if (error) return setError(error.message ?? "Could not create your account");
    router.push("/dashboard/profile?welcome=1");
    router.refresh();
  }
  return (
    <>
      <h1 className="display text-5xl">Create your portfolio</h1>
      <p className="mt-3 text-ink-2">Free. Takes about five minutes to fill in.</p>
      <div className="mt-8">
        <SocialButtons providers={providers} />
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert>{error}</Alert>
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input className="input" id="name" name="name" required maxLength={120} autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
            <p className="mt-1.5 text-xs text-muted">At least 10 characters.</p>
          </div>
          <button className="btn-ink w-full py-3" disabled={busy}>{busy ? <Spinner /> : "Create account"}</button>
        </form>
        <p className="mt-6 text-sm text-ink-2">
          Already have an account? <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">Sign in</Link>
        </p>
      </div>
    </>
  );
}

export function SignInForm({ providers }: { providers: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { data, error } = await authClient.signIn.email({ email: String(f.get("email")).trim(), password: String(f.get("password")) });
    setBusy(false);
    if (error) return setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : error.message ?? "Invalid email or password");
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return; // client plugin redirects to /two-factor
    const next = params.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  }
  return (
    <>
      <h1 className="display text-5xl">Welcome back</h1>
      <p className="mt-3 text-ink-2">Sign in to edit and publish your portfolio.</p>
      <div className="mt-8">
        <SocialButtons providers={providers} />
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert>{error}</Alert>
          {params.get("reset") === "1" && <Alert tone="ok">Password updated. Sign in with your new password.</Alert>}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="password">Password</label>
              <Link href="/forgot-password" className="text-xs text-muted hover:text-ink">Forgot?</Link>
            </div>
            <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn-ink w-full py-3" disabled={busy}>{busy ? <Spinner /> : "Sign in"}</button>
        </form>
        <p className="mt-6 text-sm text-ink-2">
          New here? <Link href="/sign-up" className="font-medium text-ink underline underline-offset-4">Create an account</Link>
        </p>
      </div>
    </>
  );
}

export function TwoFactorForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    setBusy(true);
    setError("");
    const { error } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
    setBusy(false);
    if (error) return setError(error.message ?? "That code didn't work");
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <>
      <h1 className="display text-5xl">Two-step check</h1>
      <p className="mt-3 text-ink-2">{backup ? "Enter one of your backup codes." : "Enter the 6-digit code from your authenticator app."}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Alert>{error}</Alert>
        <input className="input text-center font-mono text-2xl tracking-[0.4em]" name="code" required autoFocus autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} maxLength={backup ? 24 : 6} />
        <button className="btn-ink w-full py-3" disabled={busy}>{busy ? <Spinner /> : "Verify"}</button>
        <button type="button" className="w-full text-sm text-muted hover:text-ink" onClick={() => setBackup((b) => !b)}>
          {backup ? "Use authenticator code" : "Use a backup code"}
        </button>
      </form>
    </>
  );
}

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    await authClient.requestPasswordReset({ email: String(new FormData(e.currentTarget).get("email")).trim(), redirectTo: "/reset-password" });
    setBusy(false);
    setSent(true); // same message either way: never reveal whether an account exists
  }
  return (
    <>
      <h1 className="display text-5xl">Reset password</h1>
      {sent ? (
        <div className="mt-8"><Alert tone="ok">If an account exists for that email, a reset link is on its way.</Alert></div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <button className="btn-ink w-full py-3" disabled={busy}>{busy ? <Spinner /> : "Send reset link"}</button>
        </form>
      )}
      <p className="mt-6 text-sm"><Link href="/sign-in" className="text-ink-2 hover:text-ink">Back to sign in</Link></p>
    </>
  );
}

export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState(params.get("error") ? "This reset link is invalid or has expired." : "");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: String(new FormData(e.currentTarget).get("password")), token });
    setBusy(false);
    if (error) return setError(error.message ?? "Could not reset password");
    router.push("/sign-in?reset=1");
  }
  return (
    <>
      <h1 className="display text-5xl">Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Alert>{error}</Alert>
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input className="input" id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
        </div>
        <button className="btn-ink w-full py-3" disabled={busy || !token}>{busy ? <Spinner /> : "Update password"}</button>
      </form>
    </>
  );
}
