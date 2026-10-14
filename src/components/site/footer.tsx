import Link from "next/link";
import type { BusinessInfo } from "@/domain/site";
import { Logo } from "./logo";

export function SiteFooter({ business }: { business: BusinessInfo }) {
  const year = new Date().getFullYear();
  const wa = business.whatsapp.replace(/\D/g, "");
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo inverse />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/60">{business.tagline}</p>
        </div>
        <div>
          <p className="eyebrow !text-paper/40">Shop</p>
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            <li><Link className="hover:text-paper" href="/products">All products</Link></li>
            <li><Link className="hover:text-paper" href="/products?category=keychains">Keychains</Link></li>
            <li><Link className="hover:text-paper" href="/products?category=lockets">Lockets</Link></li>
            <li><Link className="hover:text-paper" href="/products?category=organizers">Organizers</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-paper/40">Custom</p>
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            <li><Link className="hover:text-paper" href="/estimate/keychain">Keychain estimator</Link></li>
            <li><Link className="hover:text-paper" href="/estimate/organizer">Desk organizer estimator</Link></li>
            <li><Link className="hover:text-paper" href="/estimate/custom">Print your own file</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-paper/40">Contact</p>
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            {wa ? <li><a className="hover:text-paper" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li> : null}
            {business.facebookUrl ? <li><a className="hover:text-paper" href={business.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a></li> : null}
            {business.instagramUrl ? <li><a className="hover:text-paper" href={business.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a></li> : null}
            {business.email ? <li><a className="hover:text-paper" href={`mailto:${business.email}`}>{business.email}</a></li> : null}
            {business.address ? <li className="text-paper/50">{business.address}</li> : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-paper/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {business.name}. All prices in BDT (৳).</p>
          <p>{business.hours}</p>
        </div>
      </div>
    </footer>
  );
}
