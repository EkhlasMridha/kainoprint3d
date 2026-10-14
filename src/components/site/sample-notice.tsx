export function SampleNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" className={`flex items-start gap-3 rounded-xl border border-dashed border-line-strong bg-white ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"} text-muted`}>
      <span aria-hidden className="mt-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-widest text-ink">Sample</span>
      <p>
        Products, photos and prices shown are sample content for this new storefront and will be replaced with the studio&apos;s own
        catalogue. Product images are illustrations, not photographs.
      </p>
    </div>
  );
}
