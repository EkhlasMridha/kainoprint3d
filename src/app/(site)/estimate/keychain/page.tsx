import type { Metadata } from "next";
import { KeychainEstimator } from "@/components/estimate/keychain-estimator";
import { EstimatorHeader } from "@/components/estimate/estimator-header";
import { publicOptions } from "@/server/estimates";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = {
  title: "Custom keychain estimator",
  description: "Design a personalised name, shape or logo keychain and get an instant indicative price.",
};

export default async function KeychainEstimatePage() {
  const [opts, landing] = await Promise.all([publicOptions(), getSetting("landing")]);
  return (
    <div className="container-page pt-8 sm:pt-12">
      <EstimatorHeader
        eyebrow="Estimator · Keychains"
        title="Design your keychain"
        description="Pick a style, size and colours — the price updates as you go. Simple name keychains are priced instantly; logos and custom shapes get a quick design review."
      />
      <div className="mt-10">
        <KeychainEstimator options={opts.keychain} common={opts.common} disclaimer={landing.estimateDisclaimer} />
      </div>
    </div>
  );
}
