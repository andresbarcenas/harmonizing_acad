const WHATSAPP_PHONE = "573172666317";
const WHATSAPP_MESSAGE = "Hi, I want to manage my class plan in Harmonizing";

export function buildWhatsAppPlanLink(): string {
  const encoded = encodeURIComponent(WHATSAPP_MESSAGE);
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;
}
