"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Alert, Spinner } from "@/components/form-bits";

export function Security({ twoFactorEnabled, need2fa }: { twoFactorEnabled: boolean; need2fa: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "password" | "scan" | "done">("idle");
  const [qr, setQr] = useState("");
  const [uri, setUri] = useState("");
  const [backup, setBackup] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ tone: "ok" | "bad"; t: string } | null>(null);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const password = String(new FormData(e.currentTarget).get("password"));
    const { data, error } = twoFactorEnabled
      ? await authClient.twoFactor.disable({ password })
      : await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (error) return setError(error.message ?? "Wrong password");
    if (twoFactorEnabled) {
      router.refresh();
      return setStep("idle");
    }
    const d = data as { totpURI: string; backupCodes: string[] };
    setUri(d.totpURI);
    setBackup(d.backupCodes);
    setQr(await QRCode.toDataURL(d.totpURI, { margin: 1, width: 220 }));
    setStep("scan");
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.twoFactor.verifyTotp({ code: String(new FormData(e.currentTarget).get("code")).trim() });
    setBusy(false);
    if (error) return setError(error.message ?? "That code didn't work");
    setStep("done");
    router.refresh();
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await authClient.changePassword({ currentPassword: String(f.get("current")), newPassword: String(f.get("next")), revokeOtherSessions: true });
    setPwMsg(error ? { tone: "bad", t: error.message ?? "Could not change password" } : { tone: "ok", t: "Password changed. Other devices were signed out." });
    if (!error) e.currentTarget.reset();
  }

  return (
    <>
      <div className="card mt-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Two-step verification</h2>
            <p className="mt-1 text-sm text-ink-2">Use an authenticator app (Google Authenticator, 1Password, Authy) for a second code at sign-in. Required for admin access.</p>
          </div>
          <span className={`badge ${twoFactorEnabled ? "bg-ok/10 text-ok" : "bg-paper-2 text-ink-2"}`}>{twoFactorEnabled ? "On" : "Off"}</span>
        </div>
        {need2fa && !twoFactorEnabled && <div className="mt-4"><Alert tone="info">Turn on two-step verification to open the admin panel.</Alert></div>}
        <div className="mt-5 space-y-4">
          <Alert>{error}</Alert>
          {step === "idle" && <button className="btn-ink btn-sm" onClick={() => setStep("password")}>{twoFactorEnabled ? "Turn off" : "Set up"}</button>}
          {step === "password" && (
            <form onSubmit={start} className="flex flex-wrap gap-2">
              <input className="input max-w-xs" name="password" type="password" placeholder="Confirm your password" required autoComplete="current-password" />
              <button className="btn-ink" disabled={busy}>{busy ? <Spinner /> : "Continue"}</button>
            </form>
          )}
          {step === "scan" && (
            <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code for your authenticator app" className="rounded-xl border border-line" />
              <div className="space-y-4">
                <p className="text-sm text-ink-2">Scan the code, then enter the 6-digit number your app shows.</p>
                <details className="text-xs text-muted"><summary className="cursor-pointer">Can&rsquo;t scan? Show setup key</summary><code className="mt-2 block break-all">{uri}</code></details>
                <form onSubmit={verify} className="flex gap-2">
                  <input className="input w-36 text-center font-mono tracking-widest" name="code" inputMode="numeric" maxLength={6} required autoComplete="one-time-code" />
                  <button className="btn-ink" disabled={busy}>{busy ? <Spinner /> : "Verify"}</button>
                </form>
                <div>
                  <p className="text-sm font-medium">Backup codes (save these somewhere safe)</p>
                  <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs">{backup.map((b) => <li key={b} className="rounded bg-paper-2 px-2 py-1">{b}</li>)}</ul>
                </div>
              </div>
            </div>
          )}
          {step === "done" && <Alert tone="ok">Two-step verification is on.</Alert>}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block"><span className="label">Current password</span><input className="input" name="current" type="password" required autoComplete="current-password" /></label>
          <label className="block"><span className="label">New password</span><input className="input" name="next" type="password" minLength={10} required autoComplete="new-password" /></label>
          <button className="btn-ink">Update</button>
        </form>
        {pwMsg && <div className="mt-3"><Alert tone={pwMsg.tone}>{pwMsg.t}</Alert></div>}
      </div>
    </>
  );
}
