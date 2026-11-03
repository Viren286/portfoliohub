import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { Security } from "./security";

export const metadata = { title: "Settings" };

export default async function SettingsPage(props: PageProps<"/dashboard/settings">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="eyebrow">Settings</p>
      <h1 className="display mt-2 text-5xl">Account &amp; security</h1>
      <div className="card mt-8 p-6">
        <h2 className="font-semibold">Account</h2>
        <dl className="mt-4 grid grid-cols-[140px_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Name</dt><dd>{user.name}</dd>
          <dt className="text-muted">Email</dt>
          <dd>{user.email} {user.emailVerified ? <span className="badge ml-2 bg-ok/10 text-ok">Verified</span> : <span className="badge ml-2 bg-warn/10 text-warn">Not verified</span>}</dd>
          <dt className="text-muted">Member since</dt><dd>{new Date(user.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}</dd>
        </dl>
      </div>
      <Security twoFactorEnabled={!!(user as { twoFactorEnabled?: boolean }).twoFactorEnabled} need2fa={sp.need2fa === "1" && env.adminRequire2fa} />
    </div>
  );
}
