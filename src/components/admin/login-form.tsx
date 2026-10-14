"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/field";
import { Alert, Spinner } from "../ui/primitives";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, { ok: false });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email">{(p) => <Input {...p} name="email" type="email" autoComplete="username" required autoFocus />}</Field>
      <Field label="Password">{(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}</Field>
      {state.message ? <Alert tone="loss">{state.message}</Alert> : null}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? <Spinner /> : null}
        Sign in
      </Button>
    </form>
  );
}
