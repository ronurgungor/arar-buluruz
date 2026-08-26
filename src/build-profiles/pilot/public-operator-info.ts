const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const realDataActivationEnabled = import.meta.env.VITE_REAL_DATA_ACTIVATION === "enabled";

function valueOrPlaceholder(value: string | undefined, placeholder: string): string {
  const normalized = value?.trim();
  return normalized || placeholder;
}

function optionalPublicValue(value: string | undefined, placeholder: string): string | null {
  const normalized = value?.trim();
  if (normalized) return normalized;
  return realDataActivationEnabled ? null : placeholder;
}

const phoneE164 = import.meta.env.VITE_OPERATOR_PHONE_E164?.trim() ?? "";
const email = import.meta.env.VITE_OPERATOR_EMAIL?.trim() ?? "";

export const pilotPublicOperatorInfo = {
  realDataActivationEnabled,
  legalName: valueOrPlaceholder(
    import.meta.env.VITE_OPERATOR_LEGAL_NAME,
    "Aktivasyon öncesi gerçek işletmeci adı yayımlanacaktır.",
  ),
  address: optionalPublicValue(
    import.meta.env.VITE_OPERATOR_ADDRESS,
    "Aktivasyon öncesi uygulanacak adres bilgisi kesinleştirilecektir.",
  ),
  electronicContact: valueOrPlaceholder(
    email,
    "Aktivasyon öncesi elektronik iletişim adresi yayımlanacaktır.",
  ),
  phoneDisplay: valueOrPlaceholder(phoneE164, "Aktivasyon öncesi telefon bilgisi yayımlanacaktır."),
  phoneHref: E164_PATTERN.test(phoneE164) ? `tel:${phoneE164}` : null,
  emailHref: EMAIL_PATTERN.test(email) ? `mailto:${email}` : null,
  taxRegistry: optionalPublicValue(
    import.meta.env.VITE_OPERATOR_TAX_REGISTRY,
    "Vergi / ticaret sicili bilgisi uygulanıyorsa işletme kimliği oluştuğunda yayımlanacaktır.",
  ),
} as const;
