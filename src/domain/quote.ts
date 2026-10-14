import { z } from "zod";
import { formatBDT } from "./money";

export const QUOTE_KINDS = ["product", "keychain", "organizer", "custom_file", "general"] as const;
export type QuoteKind = (typeof QUOTE_KINDS)[number];

export const QUOTE_STATUSES = ["new", "reviewing", "quoted", "accepted", "in_production", "completed", "cancelled"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  quoted: "Quote sent",
  accepted: "Accepted",
  in_production: "In production",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const QUOTE_KIND_LABELS: Record<QuoteKind, string> = {
  product: "Catalog product",
  keychain: "Custom keychain",
  organizer: "Desk organizer",
  custom_file: "Custom print (own file)",
  general: "General inquiry",
};

// Crockford base32 without easily confused characters (I, L, O, U).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Quote reference, e.g. KP-261013-7Q4M. `random` must return values in [0, 1). */
export function generateQuoteReference(now: Date, random: () => number): string {
  const yy = String(now.getUTCFullYear() % 100).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `KP-${yy}${mm}${dd}-${suffix}`;
}

const phoneRegex = /^\+?[0-9][0-9\s-]{6,18}$/;

/** Contact + common inquiry fields. Only what is needed to respond to the customer. */
export const inquiryContactSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name").max(80),
    email: z.string().trim().max(120).email("Enter a valid email").or(z.literal("")).default(""),
    phone: z.string().trim().max(20).regex(phoneRegex, "Enter a valid phone number").or(z.literal("")).default(""),
    notes: z.string().trim().max(2000, "Keep notes under 2000 characters").default(""),
  })
  .refine((v) => v.email || v.phone, { message: "Enter an email or phone number so we can reply", path: ["phone"] });

export type InquiryContact = z.infer<typeof inquiryContactSchema>;

export const customFileDetailsSchema = z.object({
  dimensions: z.string().trim().max(80).default(""),
  material: z.string().trim().max(40).default(""),
  color: z.string().trim().max(40).default(""),
  quantity: z.number().int().min(1, "At least 1").max(10_000),
  intendedUse: z.string().trim().max(300).default(""),
  requirements: z.string().trim().max(1000).default(""),
  desiredDate: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid date")
    .default(""),
});

export interface QuoteSummaryLine {
  label: string;
  value: string;
}

export interface QuoteMessageInput {
  reference: string;
  title: string;
  summary: QuoteSummaryLine[];
  quantity: number;
  low: number | null;
  high: number | null;
  customerName: string;
}

export function formatPriceRange(low: number | null, high: number | null): string {
  if (low === null || high === null) return "To be quoted after review";
  return low === high ? formatBDT(low) : `${formatBDT(low)} – ${formatBDT(high)}`;
}

/** Plain-text message used for WhatsApp, email and copy-to-clipboard. */
export function buildQuoteMessage(q: QuoteMessageInput): string {
  const lines = [
    `Hello Kaino Print 3D! I'd like a quote.`,
    ``,
    `Reference: ${q.reference}`,
    `Item: ${q.title}`,
    ...q.summary.map((s) => `${s.label}: ${s.value}`),
    `Quantity: ${q.quantity}`,
    `Indicative price: ${formatPriceRange(q.low, q.high)}`,
    ``,
    `Name: ${q.customerName}`,
    `(I understand the estimate is indicative and the final quote is confirmed after review.)`,
  ];
  return lines.join("\n");
}

/** wa.me link with a properly URL-encoded message. Returns null if no valid number is configured. */
export function whatsappLink(number: string, message: string): string | null {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(email: string, subject: string, body: string): string | null {
  if (!email || !email.includes("@")) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
