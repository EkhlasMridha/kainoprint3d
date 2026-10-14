"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass } from "../ui/button";
import { cn } from "../ui/cn";
import { Logo } from "./logo";

const NAV = [
  { href: "/products", label: "Products" },
  { href: "/#services", label: "Services" },
  { href: "/estimate", label: "Estimate a print" },
  { href: "/#process", label: "How it works" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,border-color] duration-300", scrolled || open ? "border-b border-line bg-paper/90 backdrop-blur-md" : "border-b border-transparent")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = item.href === pathname || (item.href !== "/" && !item.href.includes("#") && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("rounded-full px-3.5 py-2 text-sm transition-colors", active ? "text-ink" : "text-muted hover:text-ink")}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/estimate" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
            Get an estimate
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full hover:bg-panel lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="container-page pb-6 lg:hidden">
          <ul className="divide-y divide-line border-t border-line">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center justify-between py-3.5 font-display text-lg font-medium" onClick={() => setOpen(false)}>
                  {item.label}
                  <span aria-hidden className="text-subtle">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
