import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-baseline gap-1.5 font-semibold tracking-tight">
      <span className="text-lg">Skyline</span>
      <span className="text-sm tracking-[0.2em] text-gold uppercase">Entertainment</span>
    </Link>
  );
}
