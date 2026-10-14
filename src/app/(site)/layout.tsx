import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getSetting } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const business = await getSetting("business");
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter business={business} />
    </>
  );
}
