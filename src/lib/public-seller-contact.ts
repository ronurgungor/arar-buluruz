import { z } from "zod";

export const PUBLIC_SELLER_CONTACT_CHANNELS = ["whatsapp", "phone", "phone_whatsapp"] as const;

export const publicSellerContactSchema = z.object({
  channel: z.enum(PUBLIC_SELLER_CONTACT_CHANNELS),
  e164: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
});

export type PublicSellerContact = z.infer<typeof publicSellerContactSchema>;
export type PublicSellerContactAction = {
  kind: "phone" | "whatsapp";
  label: "Ara" | "WhatsApp’tan yaz";
  href: string;
};

export function buildPublicSellerContactActions(
  contact: PublicSellerContact,
): PublicSellerContactAction[] {
  const parsed = publicSellerContactSchema.parse(contact);
  return [
    { kind: "phone", label: "Ara", href: `tel:${parsed.e164}` },
    {
      kind: "whatsapp",
      label: "WhatsApp’tan yaz",
      href: `https://wa.me/${parsed.e164.slice(1)}`,
    },
  ];
}

export function buildPublicSellerContactHref(contact: PublicSellerContact): string {
  return buildPublicSellerContactActions(contact)[0]?.href ?? "";
}

export function getPublicSellerContactLabel(contact: PublicSellerContact): string {
  return buildPublicSellerContactActions(contact)[0]?.label ?? "İletişim";
}
