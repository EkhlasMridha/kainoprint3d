import Link from "next/link";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Kaino Print 3D — home">
      <span className={`grid size-8 place-items-center rounded-[9px] ${inverse ? "bg-paper text-ink" : "bg-ink text-paper"}`} aria-hidden>
        <svg viewBox="0 0 32 32" className="size-5">
          <path d="M9 8v16M9 16l8-8M12.5 13.5 19 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="20" y="20" width="4" height="4" rx="1" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-[1.05rem] font-bold tracking-[-0.03em]">
        Kaino <span className="font-medium text-muted">Print 3D</span>
      </span>
    </Link>
  );
}
