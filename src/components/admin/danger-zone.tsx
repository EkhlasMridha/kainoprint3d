/** Two-step delete without browser confirm dialogs: open the panel, then press the button. */
export function DangerZone({ action, id, label, description }: { action: (fd: FormData) => Promise<void>; id: string; label: string; description?: string }) {
  return (
    <details className="no-print rounded-[var(--radius-card)] border border-loss/20 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-loss">{label}…</summary>
      <form action={action} className="flex flex-wrap items-center justify-between gap-4 border-t border-loss/20 px-5 py-4">
        <input type="hidden" name="id" value={id} />
        <p className="max-w-lg text-sm text-muted">{description ?? "This cannot be undone."}</p>
        <button type="submit" className="rounded-full border border-loss/40 px-4 py-1.5 text-sm font-medium text-loss hover:bg-loss-bg">
          {label}
        </button>
      </form>
    </details>
  );
}
