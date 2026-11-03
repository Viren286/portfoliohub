import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

const NAV = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/portfolios", "Portfolios & deploys"],
  ["/admin/templates", "Templates"],
  ["/admin/plans", "Plans"],
  ["/admin/audit", "Audit log"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-ink px-5 py-6 text-paper md:flex">
        <Logo href="/admin" className="!text-paper" />
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-signal">Founder console</p>
        <nav className="mt-8 space-y-0.5 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-paper/70 hover:bg-white/10 hover:text-paper">{label}</Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 text-xs text-paper/50">
          <p className="truncate">{admin.email}</p>
          <Link href="/dashboard" className="block text-paper/70 hover:text-paper">← Back to app</Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-line bg-card px-6 py-3 md:hidden">
          <nav className="flex gap-3 overflow-x-auto text-sm">{NAV.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap text-ink-2">{label}</Link>)}</nav>
        </div>
        <main className="px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
