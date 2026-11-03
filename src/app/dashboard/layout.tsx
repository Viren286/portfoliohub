import Link from "next/link";
import { Logo } from "@/components/logo";
import { env } from "@/lib/env";
import { isAdminUser, requireUser } from "@/lib/session";
import { SignOutButton, VerifyBanner } from "./client-bits";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const admin = isAdminUser(user);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3">
          <Logo href="/dashboard" />
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/dashboard" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">Portfolios</Link>
            <Link href="/dashboard/profile" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">My details</Link>
            <Link href="/dashboard/settings" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">Settings</Link>
            {admin && <Link href="/admin" className="rounded-full px-3 py-1.5 font-medium text-signal hover:bg-signal/10">Admin</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {env.requireEmailVerification && !user.emailVerified && <VerifyBanner email={user.email} />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
