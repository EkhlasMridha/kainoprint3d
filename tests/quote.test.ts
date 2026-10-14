import { describe, expect, it } from "vitest";
import { buildQuoteMessage, generateQuoteReference, inquiryContactSchema, mailtoLink, whatsappLink } from "@/domain/quote";

describe("quote helpers", () => {
  it("generates readable references", () => {
    const ref = generateQuoteReference(new Date(Date.UTC(2026, 9, 13)), () => 0.5);
    expect(ref).toMatch(/^KP-261013-[0-9A-Z]{4}$/);
    expect(ref).not.toMatch(/[ILOU]/);
  });

  it("builds a properly URL-encoded WhatsApp link", () => {
    const msg = buildQuoteMessage({
      reference: "KP-261013-ABCD",
      title: "Custom keychain",
      summary: [{ label: "Text", value: "Rafi & Co. #1" }],
      quantity: 3,
      low: 30000,
      high: 40000,
      customerName: "Rafi",
    });
    const link = whatsappLink("+880 1712-345678", msg)!;
    expect(link.startsWith("https://wa.me/8801712345678?text=")).toBe(true);
    const encoded = link.split("?text=")[1]!;
    expect(encoded).not.toMatch(/[\s&#]/);
    expect(decodeURIComponent(encoded)).toBe(msg);
    expect(msg).toContain("৳300 – ৳400");
    expect(msg).toContain("indicative");
  });

  it("returns null for unconfigured contact channels", () => {
    expect(whatsappLink("", "hi")).toBeNull();
    expect(mailtoLink("", "s", "b")).toBeNull();
  });

  it("requires an email or phone number", () => {
    expect(inquiryContactSchema.safeParse({ name: "Rafi" }).success).toBe(false);
    expect(inquiryContactSchema.safeParse({ name: "Rafi", phone: "01712345678" }).success).toBe(true);
    expect(inquiryContactSchema.safeParse({ name: "Rafi", email: "not-an-email" }).success).toBe(false);
  });
});
