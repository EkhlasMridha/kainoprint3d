import type { Metadata } from "next";
import Link from "next/link";
import { formatBDT } from "@/domain/money";
import { publicOptions } from "@/server/estimates";

export const metadata: Metadata = {
  title: "Estimate your custom print",
  description: "Instant indicative prices for custom keychains and desk organizers, or send your own 3D file for a quote.",
};

export default async function EstimateHubPage() {
  const opts = await publicOptions();
  const cards = [
    {
      href: "/estimate/keychain",
      title: "Custom keychain",
      body: "Names, initials, shapes or your logo. Choose size, colours, material and ring.",
      meta: `Orders from ${formatBDT(opts.minimumOrder.keychain)}`,
      img: "/images/products/keychain-name.svg",
    },
    {
      href: "/estimate/organizer",
      title: "Desk organizer",
      body: "Start with a preset, then adjust size, compartments, phone stand and drawers.",
      meta: `Orders from ${formatBDT(opts.minimumOrder.organizer)}`,
      img: "/images/products/organizer-minimal.svg",
    },
    {
      href: "/estimate/custom",
      title: "Your own 3D file",
      body: "Upload an STL, 3MF or OBJ. We review and slice it, then confirm a price.",
      meta: "Quoted after review",
      img: "/images/products/detail-layers.svg",
    },
  ];
  return (
    <div className="container-page pt-10 sm:pt-14">
      <p className="eyebrow">Estimate</p>
      <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-[-0.04em] text-balance sm:text-5xl">What would you like to make?</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted">
        Get an instant, indicative price in a minute. Nothing is charged until you approve the final quote.
      </p>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-colors hover:border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.img} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            <div className="p-6">
              <p className="font-mono text-[0.68rem] uppercase tracking-widest text-subtle">{c.meta}</p>
              <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{c.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                Start <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
