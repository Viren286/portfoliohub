import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <Logo />
      <h1 className="display text-6xl">Page not found</h1>
      <p className="text-ink-2">The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
      <Link href="/" className="btn-ink w-fit">Go home</Link>
    </main>
  );
}
