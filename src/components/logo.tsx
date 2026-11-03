import Link from "next/link";

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-baseline gap-0.5 text-[19px] font-semibold tracking-tight text-ink ${className}`} aria-label="PortfolioHub home">
      <span>Portfolio</span>
      <span className="display italic text-[23px] text-signal transition-transform group-hover:-rotate-6">hub</span>
      <span className="ml-0.5 inline-block size-1.5 rounded-full bg-signal" aria-hidden />
    </Link>
  );
}
