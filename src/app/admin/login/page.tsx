import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";
import { getCurrentAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentAdmin()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-10 font-display text-2xl font-bold tracking-tight">Studio dashboard</h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage costs, products and quote requests.</p>
        <div className="mt-8">
          <LoginForm next={next ?? ""} />
        </div>
      </div>
    </main>
  );
}
