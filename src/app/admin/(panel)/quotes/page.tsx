import Link from "next/link";
import { PageHeader, Table } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatPriceRange, QUOTE_KIND_LABELS, QUOTE_STATUS_LABELS, QUOTE_STATUSES, type QuoteKind, type QuoteStatus } from "@/domain/quote";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata = { title: "Quote requests" };

const statusTone = (s: string) =>
  s === "new" ? "dark" : s === "cancelled" ? "neutral" : s === "completed" || s === "accepted" ? "profit" : s === "in_production" ? "outline" : "warn";

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = QUOTE_STATUSES.includes(status as QuoteStatus) ? (status as QuoteStatus) : undefined;
  const [quotes, counts] = await Promise.all([
    db.quoteRequest.findMany({ where: filter ? { status: filter } : {}, orderBy: { createdAt: "desc" }, take: 300 }),
    db.quoteRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <>
      <PageHeader
        title="Quote requests"
        description="Requests from the website. Indicative prices were recalculated on the server when the request arrived."
        actions={
          <ButtonLink href="/api/admin/quotes/export" variant="secondary" prefetch={false}>
            Export CSV
          </ButtonLink>
        }
      />
      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-1.5">
        {[{ key: "", label: "All", n: total }, ...QUOTE_STATUSES.map((s) => ({ key: s, label: QUOTE_STATUS_LABELS[s], n: count(s) }))].map((s) => {
          const active = (filter ?? "") === s.key;
          return (
            <Link key={s.key || "all"} href={s.key ? `/admin/quotes?status=${s.key}` : "/admin/quotes"} aria-current={active ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-sm", active ? "border-ink bg-ink text-paper" : "border-line-strong bg-white hover:border-ink")}>
              {s.label} <span className={active ? "text-paper/60" : "text-subtle"}>{s.n}</span>
            </Link>
          );
        })}
      </nav>
      {quotes.length === 0 ? (
        <EmptyState title="No quote requests" description="Requests sent from the estimators, product pages and contact form will appear here." />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Request</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Indicative</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td>
                  <Link href={`/admin/quotes/${q.id}`} className="font-mono text-xs font-medium hover:underline">
                    {q.reference}
                  </Link>
                </td>
                <td>
                  <span className="font-medium">{q.customerName}</span>
                  <span className="block text-xs text-muted">{q.phone || q.email}</span>
                </td>
                <td>
                  <span className="block max-w-xs truncate">{q.title}</span>
                  <span className="text-xs text-muted">{QUOTE_KIND_LABELS[q.kind as QuoteKind] ?? q.kind}{q.fileName ? " · 📎 file" : ""}</span>
                </td>
                <td className="num text-right">{q.quantity}</td>
                <td className="num text-right text-xs">{formatPriceRange(q.estimateLow, q.estimateHigh)}</td>
                <td>
                  <Badge tone={statusTone(q.status)}>{QUOTE_STATUS_LABELS[q.status as QuoteStatus] ?? q.status}</Badge>
                </td>
                <td className="text-xs text-muted">{q.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Dhaka" })}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
