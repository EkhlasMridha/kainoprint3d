"use client";

import { useActionState } from "react";
import { saveCategory } from "@/server/actions/catalog";
import { Button } from "../ui/button";
import { Input } from "../ui/field";

export function CategoryForm({ c }: { c?: { id: string; slug: string; name: string; description: string; sortOrder: number } }) {
  const [state, action, pending] = useActionState(saveCategory, { ok: false });
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid items-start gap-2 sm:grid-cols-[1fr_1fr_2fr_80px_auto]">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div>
        <Input name="name" aria-label="Name" placeholder="Name" defaultValue={c?.name} required aria-invalid={!!e.name} />
        {e.name ? <p className="mt-1 text-xs text-loss">{e.name}</p> : null}
      </div>
      <div>
        <Input name="slug" aria-label="Slug" placeholder="slug" defaultValue={c?.slug} required aria-invalid={!!e.slug} />
        {e.slug ? <p className="mt-1 text-xs text-loss">{e.slug}</p> : null}
      </div>
      <Input name="description" aria-label="Description" placeholder="Description" defaultValue={c?.description} />
      <Input name="sortOrder" aria-label="Sort order" type="number" min={0} defaultValue={c?.sortOrder ?? 0} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant={c ? "secondary" : "primary"} disabled={pending}>
          {c ? "Save" : "Add"}
        </Button>
        {state.ok ? <span className="text-xs text-profit" role="status">Saved</span> : null}
      </div>
    </form>
  );
}
