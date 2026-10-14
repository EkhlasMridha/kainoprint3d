import { PageHeader } from "@/components/admin/page-header";
import { EstimatorCommonForm, KeychainConfigForm, OrganizerConfigForm } from "@/components/admin/settings/estimator-forms";
import { requireAdmin } from "@/server/auth/session";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Customer estimators" };

const TABS = [
  { key: "shared", label: "Shared options" },
  { key: "keychain", label: "Keychains" },
  { key: "organizer", label: "Desk organizers" },
] as const;

export default async function EstimatorSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab = "shared" } = await searchParams;
  const [common, keychain, organizer] = await Promise.all([getSetting("estimator.common"), getSetting("estimator.keychain"), getSetting("estimator.organizer")]);
  return (
    <>
      <PageHeader
        title="Customer estimators"
        description="Simplified, customer-safe pricing rules. Estimates are calculated on the server; customers only ever see the resulting prices, never these settings."
      />
      <nav aria-label="Estimator settings" className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.key ? "border-ink font-medium" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </a>
        ))}
      </nav>
      <div className="max-w-5xl">
        {tab === "keychain" ? <KeychainConfigForm k={keychain} /> : tab === "organizer" ? <OrganizerConfigForm o={organizer} /> : <EstimatorCommonForm c={common} />}
      </div>
    </>
  );
}
