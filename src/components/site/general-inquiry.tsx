"use client";

import { QuoteRequestForm } from "../estimate/quote-request";

export function GeneralInquiryForm({ maxUploadMb }: { maxUploadMb: number }) {
  return (
    <QuoteRequestForm
      kind="general"
      config={{}}
      maxUploadMb={maxUploadMb}
      heading="Send us a message"
      intro="Describe your idea in the notes. Add a photo, sketch or file if you have one."
      submitLabel="Send message"
      fileLabel="Photo, sketch or file (optional)"
    />
  );
}
