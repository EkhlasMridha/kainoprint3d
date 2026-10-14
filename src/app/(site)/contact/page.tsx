import type { Metadata } from "next";
import { GeneralInquiryForm } from "@/components/site/general-inquiry";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Contact", description: "Contact Kaino Print 3D for custom 3D printing, design and small-batch orders." };

export default async function ContactPage() {
  const [business, common] = await Promise.all([getSetting("business"), getSetting("estimator.common")]);
  const wa = business.whatsapp.replace(/\D/g, "");
  const channels = [
    wa ? { label: "WhatsApp", value: business.whatsapp, href: `https://wa.me/${wa}` } : null,
    business.phone ? { label: "Phone", value: business.phone, href: `tel:${business.phone.replace(/[^\d+]/g, "")}` } : null,
    business.email ? { label: "Email", value: business.email, href: `mailto:${business.email}` } : null,
    business.facebookUrl ? { label: "Facebook", value: business.facebookUrl.replace(/^https?:\/\/(www\.)?/, ""), href: business.facebookUrl } : null,
    business.instagramUrl ? { label: "Instagram", value: business.instagramUrl.replace(/^https?:\/\/(www\.)?/, ""), href: business.instagramUrl } : null,
  ].filter((c): c is { label: string; value: string; href: string } => !!c);

  return (
    <div className="container-page grid gap-14 pt-10 sm:pt-14 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Tell us what you have in mind.</h1>
        <p className="mt-4 max-w-md leading-relaxed text-muted">
          Ideas, sketches, photos of a broken part, a logo for your shop — send it over. We usually reply within one working day.
        </p>
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {channels.map((c) => (
            <li key={c.label}>
              <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="group flex items-center justify-between gap-4 py-4">
                <span>
                  <span className="block text-xs text-muted">{c.label}</span>
                  <span className="font-medium">{c.value}</span>
                </span>
                <span aria-hidden className="text-subtle transition-transform group-hover:translate-x-1">→</span>
              </a>
            </li>
          ))}
        </ul>
        <dl className="mt-8 space-y-3 text-sm">
          {business.address ? <div><dt className="text-xs text-muted">Studio</dt><dd>{business.address}</dd></div> : null}
          {business.serviceArea ? <div><dt className="text-xs text-muted">Delivery</dt><dd>{business.serviceArea}</dd></div> : null}
          {business.hours ? <div><dt className="text-xs text-muted">Hours</dt><dd>{business.hours}</dd></div> : null}
        </dl>
      </div>
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
        <GeneralInquiryForm maxUploadMb={common.maxUploadMb} />
      </div>
    </div>
  );
}
