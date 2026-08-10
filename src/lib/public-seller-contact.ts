import { z } from "zod";

export const PUBLIC_SELLER_CONTACT_CHANNELS = ["whatsapp", "phone"] as const;

export const publicSellerContactSchema = z.object({
  channel: z.enum(PUBLIC_SELLER_CONTACT_CHANNELS),
  e164: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
});

export type PublicSellerContact = z.infer<typeof publicSellerContactSchema>;

export function buildPublicSellerContactHref(contact: PublicSellerContact): string {
  const parsed = publicSellerContactSchema.parse(contact);

  if (parsed.channel === "whatsapp") {
    return `https://wa.me/${parsed.e164.slice(1)}`;
  }

  return `tel:${parsed.e164}`;
}

export function getPublicSellerContactLabel(contact: PublicSellerContact): string {
  return contact.channel === "whatsapp" ? "WhatsApp’tan yaz" : "Satıcıyı ara";
}
