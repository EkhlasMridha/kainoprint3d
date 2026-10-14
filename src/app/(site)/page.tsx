import Link from "next/link";
import { ProductCard } from "@/components/site/product-card";
import { SampleNotice } from "@/components/site/sample-notice";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import { listPublicProducts } from "@/server/catalog";
import { getSetting } from "@/server/settings";

const SERVICES = [
  { n: "01", title: "Name keychains & lockets", body: "Names, initials and dates on keychains and pendants — a personal gift that lasts.", href: "/estimate/keychain", cta: "Estimate a keychain" },
  { n: "02", title: "Custom desk organizers", body: "Trays, pen holders and phone stands sized to your desk and the things you keep on it.", href: "/estimate/organizer", cta: "Design an organizer" },
  { n: "03", title: "Functional everyday products", body: "Cable clips, hooks, planters and small fixes that make daily life a little easier.", href: "/products?category=functional", cta: "See functional items" },
  { n: "04", title: "Custom 3D modelling & printing", body: "Send a sketch, photo or idea. We model it, show you the design, then print it.", href: "/contact", cta: "Tell us your idea" },
  { n: "05", title: "Prototyping & one-off designs", body: "Test a product idea, replace a broken part or make something that doesn't exist yet.", href: "/estimate/custom", cta: "Upload a file" },
  { n: "06", title: "Small-batch printing", body: "10 to 500 pieces for events, shops and brands, with matching quality across the batch.", href: "/estimate/keychain", cta: "Price a batch" },
];

const PROCESS = [
  { title: "Share your idea", body: "Use an estimator, pick a product or send us a file, photo or sketch." },
  { title: "Approve the design & estimate", body: "We confirm the design, material, colours and final price with you before printing." },
  { title: "We print your product", body: "Printed on calibrated machines, then cleaned up and finished by hand." },
  { title: "Quality check & delivery", body: "Every piece is inspected, packed safely and delivered across Bangladesh." },
];

const FAQ = [
  { q: "How accurate are the online estimates?", a: "They're a good guide, based on size, material and options. The final price is confirmed after we review your design — we never start printing until you've agreed to it." },
  { q: "What is 3D printing, in simple terms?", a: "A machine builds your object layer by layer from a plastic filament, a bit like a very precise hot-glue gun. It's ideal for personalised and one-of-a-kind items." },
  { q: "Which material should I choose?", a: "PLA is great for decorative items and gifts. PETG is tougher and handles heat better, so it suits things used every day. TPU is soft and flexible. We'll recommend one if you're unsure." },
  { q: "How do I pay and get my order?", a: "After you approve the quote we'll share payment options (such as bKash, Nagad or bank transfer) and arrange delivery or pickup." },
];

export default async function HomePage() {
  const [landing, products] = await Promise.all([getSetting("landing"), listPublicProducts()]);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const heroTiles = [
    products.find((p) => p.slug === "classic-name-keychain"),
    products.find((p) => p.slug === "heart-name-locket"),
    products.find((p) => p.slug === "minimal-desk-tray"),
    products.find((p) => p.slug === "phone-stand-organizer"),
  ].filter((p): p is NonNullable<typeof p> => !!p && p.images.length > 0);
  const tiles = heroTiles.length >= 3 ? heroTiles : products.filter((p) => p.images.length).slice(0, 4);

  return (
    <>
      {/* ------------------------------------------------------------------ Hero */}
      <section className="container-page pb-20 pt-10 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="animate-rise">
            <p className="eyebrow">{landing.heroEyebrow}</p>
            <h1 className="mt-5 font-display text-[clamp(2.6rem,7vw,5.2rem)] font-bold leading-[0.95] tracking-[-0.045em] text-balance">
              {landing.heroHeadline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted text-pretty">{landing.heroSubheadline}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/products" size="lg">
                Explore Products
              </ButtonLink>
              <ButtonLink href="/estimate" size="lg" variant="secondary">
                Estimate Your Custom Print
              </ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              <div>
                <dt className="text-xs text-muted">Made in</dt>
                <dd className="mt-1 font-display font-semibold">Bangladesh</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Orders from</dt>
                <dd className="mt-1 font-display font-semibold">1 piece</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Price confirmed</dt>
                <dd className="mt-1 font-display font-semibold">Before printing</dd>
              </div>
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Featured products">
            {tiles.slice(0, 4).map((p, i) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className={`group relative overflow-hidden rounded-[var(--radius-card)] bg-panel animate-rise ${i % 2 === 1 ? "translate-y-6 sm:translate-y-10" : ""}`}
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]!.src} alt={p.images[0]!.alt} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <span className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium backdrop-blur">{p.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {landing.showSampleNotice && products.some((p) => p.isSample) ? (
        <div className="container-page">
          <SampleNotice />
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ Services */}
      <section id="services" className="container-page scroll-mt-20 py-20 sm:py-28">
        <SectionHeading eyebrow="Services" title="What we make" description={landing.servicesIntro} />
        <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.n} href={s.href} className="group flex flex-col bg-white p-7 transition-colors hover:bg-paper">
              <span className="font-mono text-xs text-subtle">{s.n}</span>
              <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.body}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium">
                {s.cta}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ Process */}
      <section id="process" className="scroll-mt-20 bg-ink py-20 text-paper sm:py-28">
        <div className="container-page">
          <p className="eyebrow !text-paper/50">How it works</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            From idea to your door in four simple steps.
          </h2>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {PROCESS.map((step, i) => (
              <li key={step.title} className="relative border-t border-paper/15 pt-6">
                <span className="font-mono text-xs text-paper/40">Step {i + 1}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/60">{step.body}</p>
                {i < PROCESS.length - 1 ? <span aria-hidden className="absolute right-0 top-5 hidden text-paper/30 lg:block">→</span> : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Featured products */}
      <section className="container-page py-20 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow="Ready to order" title="Popular products" description="Choose a design, personalise it and get an instant price estimate." />
          <ButtonLink href="/products" variant="secondary">
            View all products
          </ButtonLink>
        </div>
        <div className="mt-12 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ Estimators */}
      <section className="container-page">
        <div className="rounded-[calc(var(--radius-card)*2)] bg-panel p-6 sm:p-12">
          <SectionHeading eyebrow="Custom work" title="Something more personal? Estimate it in a minute." description="Pick a starting point and see an indicative price as you go. We confirm the final price with you before printing." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { href: "/estimate/keychain", title: "Custom keychain", body: "Name, shape or logo. Choose size, colours and ring.", img: "/images/products/keychain-dual.svg" },
              { href: "/estimate/organizer", title: "Desk organizer", body: "Start from a preset and adjust size and features.", img: "/images/products/organizer-drawer.svg" },
              { href: "/estimate/custom", title: "Print your own file", body: "Have an STL, 3MF or OBJ? Send it for a quote.", img: "/images/products/detail-layers.svg" },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="group overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-colors hover:border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt="" className="aspect-[16/10] w-full object-cover" />
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted">{c.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                    Start estimate <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ About + FAQ */}
      <section className="container-page grid gap-14 py-20 sm:py-28 lg:grid-cols-2">
        <div>
          <p className="eyebrow">About</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{landing.aboutTitle}</h2>
          <p className="mt-5 text-base leading-relaxed text-muted">{landing.aboutBody}</p>
        </div>
        <div>
          <p className="eyebrow">Questions</p>
          <div className="mt-3 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span aria-hidden className="text-subtle transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
