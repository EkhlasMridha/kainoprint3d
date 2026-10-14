"use client";

import { useId, useState } from "react";

/** Accessible tooltip: opens on hover and keyboard focus, closes on Escape. */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="More information"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="inline-flex size-4 items-center justify-center rounded-full border border-line-strong text-[0.6rem] font-semibold leading-none text-muted hover:border-ink hover:text-ink"
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs font-normal leading-relaxed text-paper shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
