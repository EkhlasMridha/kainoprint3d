import { PageHeader } from "@/components/admin/page-header";
import { BusinessForm, LandingForm } from "@/components/admin/settings/site-forms";
import { requireAdmin } from "@/server/auth/session";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Contact & website" };

export default async function SiteSettingsPage() {
  await requireAdmin();
  const [business, landing] = await Promise.all([getSetting("business"), getSetting("landing")]);
  return (
    <>
      <PageHeader title="Contact & website" description="Public contact details and landing-page copy." />
      <div className="max-w-4xl space-y-10">
        <BusinessForm b={business} />
        <LandingForm l={landing} />
      </div>
    </>
  );
}
