import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm animate-rise py-12">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:block">
        <div className="absolute -right-24 -top-24 size-[520px] rounded-full bg-signal/90 blur-[2px]" />
        <div className="absolute inset-0 grain" />
        <div className="relative flex h-full flex-col justify-end p-14">
          <p className="display text-[clamp(3rem,5vw,5rem)]">
            One form.
            <br />
            <em>A website that looks designed.</em>
          </p>
          <p className="mt-6 max-w-md text-paper/60">Your details go in once. Switch designs whenever you like; your site updates in seconds.</p>
        </div>
      </aside>
    </div>
  );
}
