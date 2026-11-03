import { Logo } from "@/components/logo";

export const metadata = { title: "Account suspended" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <Logo />
      <h1 className="display text-5xl">Your account is suspended</h1>
      <p className="text-ink-2">Your portfolio is offline while we review your account. If you think this is a mistake, reply to the email we sent you or contact support.</p>
    </main>
  );
}
