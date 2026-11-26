/** How a 1:1 lesson's price reads. A trial lesson with no price is free. */
export function lessonPriceLabel(isTrial: boolean, cents: number | null | undefined): string {
  const euro = (c: number) => `€${Number.isInteger(c / 100) ? c / 100 : (c / 100).toFixed(2)}`;
  if (isTrial) return !cents ? "Free trial lesson" : `Trial lesson · ${euro(cents)}`;
  return cents == null ? "Price agreed with the teacher" : euro(cents);
}
