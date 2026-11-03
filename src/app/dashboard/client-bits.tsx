"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { resendVerificationAction } from "./actions";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="text-sm text-ink-2 hover:text-ink"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

export function VerifyBanner({ email }: { email: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="border-b border-warn/30 bg-warn/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-2.5 text-sm text-ink">
        <span>Verify <strong>{email}</strong> to publish your portfolio.</span>
        <button
          className="font-medium underline underline-offset-4 disabled:opacity-50"
          disabled={pending}
          onClick={() => start(async () => setMsg((await resendVerificationAction()).ok ? "Sent. Check your inbox." : "Please wait before resending."))}
        >
          Resend email
        </button>
        {msg && <span className="text-ink-2">{msg}</span>}
      </div>
    </div>
  );
}
