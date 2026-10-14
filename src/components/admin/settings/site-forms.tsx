"use client";

import type { BusinessInfo, LandingContent } from "@/domain/site";
import { saveBusiness, saveLanding } from "@/server/actions/settings";
import { ActionForm, CheckF, FormSection, TextareaF, TextF } from "../form";

export function BusinessForm({ b }: { b: BusinessInfo }) {
  return (
    <ActionForm action={saveBusiness} submitLabel="Save contact details">
      <FormSection title="Business & contact links" description="Shown in the footer, contact page and quote confirmations.">
        <TextF name="name" label="Business name" defaultValue={b.name} required maxLength={80} />
        <TextF name="tagline" label="Tagline" defaultValue={b.tagline} maxLength={160} />
        <TextF name="whatsapp" label="WhatsApp number" defaultValue={b.whatsapp} maxLength={30} hint="International format, e.g. +8801XXXXXXXXX. Used for wa.me links." />
        <TextF name="phone" label="Phone" defaultValue={b.phone} maxLength={30} />
        <TextF name="email" label="Email" type="email" defaultValue={b.email} maxLength={120} />
        <TextF name="facebookUrl" label="Facebook page URL" defaultValue={b.facebookUrl} maxLength={200} />
        <TextF name="instagramUrl" label="Instagram URL" defaultValue={b.instagramUrl} maxLength={200} />
        <TextF name="address" label="Studio location" defaultValue={b.address} maxLength={200} />
        <TextF name="serviceArea" label="Delivery area" defaultValue={b.serviceArea} maxLength={200} />
        <TextF name="hours" label="Opening hours" defaultValue={b.hours} maxLength={120} />
      </FormSection>
    </ActionForm>
  );
}

export function LandingForm({ l }: { l: LandingContent }) {
  return (
    <ActionForm action={saveLanding} submitLabel="Save website content">
      <FormSection title="Landing page" columns={1}>
        <TextF name="heroEyebrow" label="Hero eyebrow" defaultValue={l.heroEyebrow} maxLength={80} />
        <TextF name="heroHeadline" label="Hero headline" defaultValue={l.heroHeadline} required maxLength={120} />
        <TextareaF name="heroSubheadline" label="Hero supporting text" defaultValue={l.heroSubheadline} maxLength={300} />
        <TextareaF name="servicesIntro" label="Services introduction" defaultValue={l.servicesIntro} maxLength={300} />
        <TextF name="aboutTitle" label="About title" defaultValue={l.aboutTitle} maxLength={120} />
        <TextareaF name="aboutBody" label="About text" defaultValue={l.aboutBody} rows={5} maxLength={1500} />
        <TextareaF name="estimateDisclaimer" label="Estimate disclaimer" defaultValue={l.estimateDisclaimer} maxLength={400} hint="Shown under every customer estimate." />
        <CheckF name="showSampleNotice" label="Show the 'sample content' notice" defaultChecked={l.showSampleNotice} hint="Turn off once sample products and images have been replaced." />
      </FormSection>
    </ActionForm>
  );
}
