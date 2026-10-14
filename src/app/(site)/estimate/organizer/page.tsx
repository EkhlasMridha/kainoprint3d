import type { Metadata } from "next";
import { EstimatorHeader } from "@/components/estimate/estimator-header";
import { OrganizerEstimator } from "@/components/estimate/organizer-estimator";
import { publicOptions } from "@/server/estimates";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = {
  title: "Desk organizer estimator",
  description: "Configure a custom 3D-printed desk organizer — size, compartments, phone stand, drawers — and get an indicative price.",
};

export default async function OrganizerEstimatePage() {
  const [opts, landing] = await Promise.all([publicOptions(), getSetting("landing")]);
  return (
    <div className="container-page pt-8 sm:pt-12">
      <EstimatorHeader
        eyebrow="Estimator · Desk organizers"
        title="Build your desk organizer"
        description="Start from one of our designs and adjust it to fit your desk. Bigger isn't always proportionally more expensive — the price follows the material and printing time your design actually needs."
      />
      <div className="mt-10">
        <OrganizerEstimator options={opts.organizer} common={opts.common} disclaimer={landing.estimateDisclaimer} />
      </div>
    </div>
  );
}
