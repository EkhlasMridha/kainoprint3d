import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { QuoteStatusForm } from "@/components/admin/quote-status-form";
import { buttonClass } from "@/components/ui/button";
import { Alert, Card, CardHeader } from "@/components/ui/primitives";
import { formatBDT } from "@/domain/money";
import { buildQuoteMessage, formatPriceRange, mailtoLink, QUOTE_KIND_LABELS, whatsappLink, type QuoteKind } from "@/domain/quote";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata = { title: "Quote request" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const q = await db.quoteRequest.findUnique({ where: { id }, include: { product: { select: { id: true, name: true } } } });
  if (!q) notFound();
  const config = (q.configuration ?? {}) as { summary?: { label: string; value: string }[] };
  const summary = Array.isArray(config.summary) ? config.summary : [];
  const reply = q.finalPrice !== null
    ? `Hi ${q.customerName}, thank you for your request ${q.reference} (${q.title}). Your confirmed price is ${formatBDT(q.finalPrice)} for ${q.quantity} piece(s). Shall we go ahead?`
    : buildQuoteMessage({ reference: q.reference, title: q.title, summary, quantity: q.quantity, low: q.estimateLow, high: q.estimateHigh, customerName: q.customerName });
  const wa = q.phone ? whatsappLink(q.phone.startsWith("0") ? `88${q.phone}` : q.phone, reply) : null;
  const mail = q.email ? mailtoLink(q.email, `Your Kaino Print 3D quote ${q.reference}`, reply) : null;

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{q.reference}</span>}
        description={`${QUOTE_KIND_LABELS[q.kind as QuoteKind] ?? q.kind} · received ${q.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })}`}
        back={{ href: "/admin/quotes", label: "Quote requests" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={q.title} description={q.product ? `Catalog product: ${q.product.name}` : undefined} />
            <dl className="divide-y divide-line text-sm">
              {summary.map((s) => (
                <div key={s.label} className="grid grid-cols-[160px_1fr] gap-4 px-5 py-2.5">
                  <dt className="text-muted">{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[160px_1fr] gap-4 px-5 py-2.5">
                <dt className="text-muted">Quantity</dt>
                <dd className="num">{q.quantity}</dd>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 px-5 py-2.5">
                <dt className="text-muted">Indicative price</dt>
                <dd className="num font-medium">{formatPriceRange(q.estimateLow, q.estimateHigh)}</dd>
              </div>
            </dl>
          </Card>
          {q.notes ? (
            <Card>
              <CardHeader title="Customer notes" />
              <p className="whitespace-pre-wrap px-5 py-4 text-sm">{q.notes}</p>
            </Card>
          ) : null}
          {q.fileStoredName ? (
            <Card>
              <CardHeader title="Attached file" />
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <span>
                  <span className="font-medium">{q.fileName}</span>
                  <span className="block text-xs text-muted">
                    {q.fileMime} · {((q.fileSize ?? 0) / 1024).toFixed(0)} KB
                  </span>
                </span>
                <a href={`/api/admin/files/${q.id}`} className={buttonClass("secondary", "sm")}>
                  Download
                </a>
              </div>
              <p className="border-t border-line px-5 py-3 text-xs text-muted">Customer files are untrusted. Open them in your slicer, not by double-clicking unknown file types.</p>
            </Card>
          ) : null}
          {q.kind !== "custom_file" && q.estimateLow !== null ? (
            <Alert tone="info">
              Before confirming, run a cost calculation with the sliced model to check the final price against your costs and margin.
            </Alert>
          ) : null}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Customer" />
            <dl className="space-y-2 px-5 py-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Name</dt>
                <dd className="font-medium">{q.customerName}</dd>
              </div>
              {q.phone ? (
                <div>
                  <dt className="text-xs text-muted">Phone</dt>
                  <dd><a className="underline" href={`tel:${q.phone}`}>{q.phone}</a></dd>
                </div>
              ) : null}
              {q.email ? (
                <div>
                  <dt className="text-xs text-muted">Email</dt>
                  <dd><a className="underline" href={`mailto:${q.email}`}>{q.email}</a></dd>
                </div>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
              {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>Reply on WhatsApp</a> : null}
              {mail ? <a href={mail} className={buttonClass("secondary", "sm")}>Reply by email</a> : null}
            </div>
          </Card>
          <QuoteStatusForm id={q.id} status={q.status} finalPrice={q.finalPrice !== null ? q.finalPrice / 100 : ""} adminNotes={q.adminNotes} />
        </div>
      </div>
    </>
  );
}
