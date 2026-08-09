export const PUBLIC_V0_DISABLED_CONTACT_HREF = "#contact-demo" as const;

export const TEST_ONLY_CONTACT = {
  phoneHref: "tel:0",
  whatsappHref: "https://wa.me/0",
} as const;

export const buildControlledWhatsAppHref = (message: string) =>
  `${TEST_ONLY_CONTACT.whatsappHref}?text=${encodeURIComponent(message)}`;
