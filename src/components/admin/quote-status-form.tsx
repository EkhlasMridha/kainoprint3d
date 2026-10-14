"use client";

import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from "@/domain/quote";
import { updateQuote } from "@/server/actions/quotes";
import { ActionForm, NumF, SelectF, TextareaF } from "./form";

export function QuoteStatusForm({ id, status, finalPrice, adminNotes }: { id: string; status: string; finalPrice: number | ""; adminNotes: string }) {
  return (
    <ActionForm action={updateQuote} submitLabel="Update">
      <input type="hidden" name="id" value={id} />
      <div className="space-y-4 rounded-[var(--radius-card)] border border-line bg-white p-5">
        <h2 className="font-display font-semibold">Status & final price</h2>
        <SelectF name="status" label="Status" defaultValue={status} options={QUOTE_STATUSES.map((s) => ({ value: s, label: QUOTE_STATUS_LABELS[s] }))} />
        <NumF name="finalPrice" label="Confirmed total price" unit="৳" min={0} defaultValue={finalPrice} hint="Used in sales reports once accepted" />
        <TextareaF name="adminNotes" label="Internal notes" defaultValue={adminNotes} rows={4} maxLength={4000} />
      </div>
    </ActionForm>
  );
}
