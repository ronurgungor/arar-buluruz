const phoneE164 = "+905321739111";
const whatsappNumber = phoneE164.replace(/\D/g, "");

export const PROTOTYPE_CONTACT = {
  phoneE164,
  whatsappNumber,
  phoneHref: `tel:${phoneE164}`,
  whatsappHref: `https://wa.me/${whatsappNumber}`,
} as const;
