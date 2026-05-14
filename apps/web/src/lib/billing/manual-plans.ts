export type ManualMonthlyClassCount = 4 | 8;

export function manualPlanId(monthlyClassCount: ManualMonthlyClassCount, priceUsd: number) {
  return `plan_manual_${monthlyClassCount}_${priceUsd}`;
}

export function manualPlanName(monthlyClassCount: ManualMonthlyClassCount, locale?: string) {
  return locale === "es" ? `Plan manual ${monthlyClassCount} clases` : `Manual ${monthlyClassCount}-class plan`;
}

export function manualPlanDescription(locale?: string) {
  return locale === "es" ? "Plan registrado para facturación externa/manual." : "Plan recorded for external/manual billing.";
}

export function planLabel({ priceUsd, monthlyClassCount }: { priceUsd: number; monthlyClassCount: number }, locale?: string) {
  return `$${priceUsd} USD / ${monthlyClassCount} ${locale === "es" ? "clases" : "classes"}`;
}
