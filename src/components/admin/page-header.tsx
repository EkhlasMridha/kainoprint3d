import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-8">
      {back ? (
        <Link href={back.href} className="no-print text-sm text-muted hover:text-ink">
          ← {back.label}
        </Link>
      ) : null}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="no-print flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted [&_thead]:border-b [&_thead]:border-line [&_thead]:bg-paper [&_tbody_tr]:border-b [&_tbody_tr]:border-line [&_tbody_tr:last-child]:border-0 [&_tbody_tr:hover]:bg-paper/60">
        {children}
      </table>
    </div>
  );
}
