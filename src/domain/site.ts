import { z } from "zod";

/** Business contact details and landing-page copy (public, owner-editable). */

const optionalUrl = z.string().trim().url("Enter a full URL starting with https://").or(z.literal(""));

export const businessSchema = z.object({
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(160),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  phone: z.string().trim().max(30),
  /** WhatsApp number in international format, e.g. +8801XXXXXXXXX. */
  whatsapp: z.string().trim().max(30),
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  address: z.string().trim().max(200),
  serviceArea: z.string().trim().max(200),
  hours: z.string().trim().max(120),
});
export type BusinessInfo = z.infer<typeof businessSchema>;

export const landingSchema = z.object({
  heroEyebrow: z.string().trim().max(80),
  heroHeadline: z.string().trim().min(1).max(120),
  heroSubheadline: z.string().trim().max(300),
  servicesIntro: z.string().trim().max(300),
  aboutTitle: z.string().trim().max(120),
  aboutBody: z.string().trim().max(1500),
  estimateDisclaimer: z.string().trim().max(400),
  showSampleNotice: z.boolean(),
});
export type LandingContent = z.infer<typeof landingSchema>;

export const DEFAULT_BUSINESS: BusinessInfo = {
  name: "Kaino Print 3D",
  tagline: "Personalized 3D-printed products, made in Bangladesh.",
  email: "hello@kainoprint3d.com",
  phone: "+880 1700-000000",
  whatsapp: "+8801700000000",
  facebookUrl: "https://facebook.com/kainoprint3d",
  instagramUrl: "",
  address: "Dhaka, Bangladesh",
  serviceArea: "Delivery across Bangladesh",
  hours: "Sat–Thu, 10:00–20:00",
};

export const DEFAULT_LANDING: LandingContent = {
  heroEyebrow: "Custom 3D printing · Dhaka",
  heroHeadline: "Your Ideas. Precisely Printed.",
  heroSubheadline:
    "Personalized 3D-printed products, custom designs, and functional everyday accessories—made to fit your style and needs.",
  servicesIntro:
    "From a single name keychain to a batch of branded desk accessories, we design, print and finish every piece in our own studio.",
  aboutTitle: "A small studio that cares about the details",
  aboutBody:
    "Kaino Print 3D is an independent maker studio. We print on calibrated machines with quality filament, check every piece by hand, and help you turn rough ideas into objects you'll actually use.",
  estimateDisclaimer:
    "Estimates are indicative. Your final quote may change after design review, material selection and slicing — we always confirm the price before we print.",
  showSampleNotice: true,
};
