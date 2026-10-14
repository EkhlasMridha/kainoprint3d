import type { Metadata } from "next";
import { CustomFileForm } from "@/components/estimate/custom-file-form";
import { EstimatorHeader } from "@/components/estimate/estimator-header";
import { publicOptions } from "@/server/estimates";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = {
  title: "Print your own 3D file",
  description: "Upload an STL, 3MF or OBJ file and get a confirmed quote after technical review.",
};

export default async function CustomPrintPage() {
  const [opts, landing] = await Promise.all([publicOptions(), getSetting("landing")]);
  return (
    <div className="container-page pt-8 sm:pt-12">
      <EstimatorHeader
        eyebrow="Custom print"
        title="Print your own file"
        description="Already have a 3D model? Send it to us. We'll review it, slice it and reply with a confirmed price before anything is printed."
      />
      <div className="mt-10">
        <CustomFileForm common={opts.common} disclaimer={landing.estimateDisclaimer} />
      </div>
    </div>
  );
}
