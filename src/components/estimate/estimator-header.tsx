import Link from "next/link";

export function EstimatorHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="max-w-2xl">
      <Link href="/estimate" className="text-sm text-muted hover:text-ink">
        ← All estimators
      </Link>
      <p className="eyebrow mt-6">{eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{title}</h1>
      <p className="mt-4 leading-relaxed text-muted">{description}</p>
    </header>
  );
}
