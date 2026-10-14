import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/nav";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Kaino Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const newQuotes = await db.quoteRequest.count({ where: { status: "new" } });
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[232px_1fr]">
      <AdminNav admin={admin} newQuotes={newQuotes} />
      <div className="min-w-0">
        <main id="main" className="mx-auto max-w-[1280px] px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
