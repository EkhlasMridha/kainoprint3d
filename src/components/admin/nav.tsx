"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminIdentity } from "@/server/auth/session";
import { logoutAction } from "@/server/actions/auth";
import { cn } from "../ui/cn";
import { Logo } from "../site/logo";

const GROUPS = [
  {
    label: "Costing",
    items: [
      { href: "/admin", label: "Dashboard", exact: true },
      { href: "/admin/calculator", label: "New calculation" },
      { href: "/admin/calculations", label: "Saved calculations" },
      { href: "/admin/printers", label: "Printers" },
      { href: "/admin/materials", label: "Materials" },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/quotes", label: "Quote requests", badge: true },
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/reports", label: "Reports" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/settings/costing", label: "Costing & pricing" },
      { href: "/admin/settings/estimators", label: "Customer estimators" },
      { href: "/admin/settings/site", label: "Contact & website" },
    ],
  },
];

export function AdminNav({ admin, newQuotes }: { admin: AdminIdentity; newQuotes: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Admin" className="space-y-7">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="eyebrow px-3 !text-[0.62rem]">{g.label}</p>
          <ul className="mt-2 space-y-0.5">
            {g.items.map((item) => {
              const active = "exact" in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors", active ? "bg-ink text-paper" : "text-ink-2 hover:bg-panel")}
                  >
                    {item.label}
                    {"badge" in item && item.badge && newQuotes > 0 ? (
                      <span className={cn("rounded-full px-1.5 text-[0.68rem] font-semibold", active ? "bg-paper text-ink" : "bg-ink text-paper")}>{newQuotes}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-nav" className="rounded-full px-3 py-1.5 text-sm hover:bg-panel">
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <aside
        id="admin-nav"
        className={cn(
          "no-print border-r border-line bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col",
          open ? "block border-b px-3 pb-6 pt-4" : "hidden",
          "lg:px-3 lg:pb-5 lg:pt-6",
        )}
      >
        <div className="hidden px-3 lg:block">
          <Logo />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto lg:mt-10">{nav}</div>
        <div className="mt-8 border-t border-line px-3 pt-4">
          <p className="truncate text-sm font-medium">{admin.name}</p>
          <p className="truncate text-xs text-muted">{admin.email}</p>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/" className="text-muted hover:text-ink" target="_blank">
              View site ↗
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-muted hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
