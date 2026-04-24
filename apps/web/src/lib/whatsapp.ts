const WHATSAPP_PHONE = "573172666317";
const WHATSAPP_MESSAGE = "Hi, I want to manage my class plan in Harmonizing";
const PASSWORD_SUPPORT_MESSAGE = "Hi, I need help recovering my Harmonizing password";

export function buildWhatsAppLink(message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;
}

export function buildWhatsAppPlanLink(): string {
  return buildWhatsAppLink(WHATSAPP_MESSAGE);
}

export function buildWhatsAppPasswordSupportLink(): string {
  return buildWhatsAppLink(PASSWORD_SUPPORT_MESSAGE);
}
