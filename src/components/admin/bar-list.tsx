import { cn } from "../ui/cn";

export interface BarItem {
  label: string;
  value: number;
  display: string;
  detail?: string;
  tone?: "default" | "loss" | "warn";
  /** Optional reference mark (e.g. 100% capacity), as a fraction of max. */
  href?: string;
}

/**
 * Ranked horizontal bars: single series in ink, direct value labels (the bars double as a
 * table), hover detail via title + visible text. Negative values render in the loss tone.
 */
export function BarList({ items, max, empty, caption }: { items: BarItem[]; max?: number; empty: string; caption: string }) {
  if (!items.length) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  const top = max ?? Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <figure>
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="space-y-3">
        {items.map((i) => {
          const pct = Math.min(100, (Math.abs(i.value) / top) * 100);
          return (
            <li key={i.label} className="group" title={i.detail ? `${i.label}: ${i.display} · ${i.detail}` : `${i.label}: ${i.display}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{i.label}</span>
                <span className={cn("num shrink-0 font-medium", i.tone === "loss" && "text-loss")}>{i.display}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-panel">
                <div
                  className={cn("h-2 rounded-full transition-[width] duration-500 group-hover:opacity-80", i.tone === "loss" ? "bg-loss" : i.tone === "warn" ? "bg-warn" : "bg-ink")}
                  style={{ width: `${Math.max(pct, i.value !== 0 ? 1.5 : 0)}%` }}
                />
              </div>
              {i.detail ? <p className="mt-1 text-xs text-muted">{i.detail}</p> : null}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
