export type ManualMonthlyClassCount = 2 | 4 | 8;

export const INTERNAL_CLASS_ALLOWANCE_PRICE_USD = 0;

export function manualPlanId(monthlyClassCount: ManualMonthlyClassCount) {
  return `plan_manual_${monthlyClassCount}`;
}

export function manualPlanName(monthlyClassCount: ManualMonthlyClassCount, locale?: string) {
  return locale === "es" ? `Plan de ${monthlyClassCount} clases` : `${monthlyClassCount}-class plan`;
}

export function manualPlanDescription(locale?: string) {
  return locale === "es" ? "Cantidad de clases registrada; las facturas se gestionan en Harmonizing." : "Class allowance recorded; invoices are managed in Harmonizing.";
}

export function planLabel({ monthlyClassCount }: { monthlyClassCount: number }, locale?: string) {
  return locale === "es" ? `${monthlyClassCount} clases/mes` : `${monthlyClassCount} classes/month`;
}
