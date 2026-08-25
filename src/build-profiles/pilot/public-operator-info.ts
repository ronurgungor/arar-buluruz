const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function valueOrPlaceholder(value: string | undefined, placeholder: string): string {
  const normalized = value?.trim();
  return normalized || placeholder;
}

const phoneE164 = import.meta.env.VITE_OPERATOR_PHONE_E164?.trim() ?? "";
const email = import.meta.env.VITE_OPERATOR_EMAIL?.trim() ?? "";

export const pilotPublicOperatorInfo = {
  realDataActivationEnabled: import.meta.env.VITE_REAL_DATA_ACTIVATION === "enabled",
  legalName: valueOrPlaceholder(
    import.meta.env.VITE_OPERATOR_LEGAL_NAME,
    "Aktivasyon öncesi gerçek işletmeci adı yayımlanacaktır.",
  ),
  address: valueOrPlaceholder(
    import.meta.env.VITE_OPERATOR_ADDRESS,
    "Aktivasyon öncesi tebligata uygun adres yayımlanacaktır.",
  ),
  electronicContact: valueOrPlaceholder(
    email,
    "Aktivasyon öncesi elektronik iletişim adresi yayımlanacaktır.",
  ),
  phoneDisplay: valueOrPlaceholder(
    phoneE164,
    "Aktivasyon öncesi telefon bilgisi yayımlanacaktır.",
  ),
  phoneHref: E164_PATTERN.test(phoneE164) ? `tel:${phoneE164}` : null,
  emailHref: EMAIL_PATTERN.test(email) ? `mailto:${email}` : null,
  taxRegistry: valueOrPlaceholder(
    import.meta.env.VITE_OPERATOR_TAX_REGISTRY,
    "Vergi / ticaret sicili bilgisi işletme kimliği oluştuğunda yayımlanacaktır.",
  ),
} as const;
