import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[70dvh] flex-col items-start justify-center py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-5xl font-bold tracking-[-0.04em]">This page didn&apos;t print.</h1>
      <p className="mt-4 max-w-md text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/products" variant="secondary">
          Browse products
        </ButtonLink>
      </div>
    </main>
  );
}
