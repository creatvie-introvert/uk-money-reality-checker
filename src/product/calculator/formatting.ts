import { absoluteMoney, compareMoney, formatGbp, fromGbp, type Money } from "@/engine/money";
/** Display boundary only. No Number conversion, no rounded values returned to calculations. */
export function formatMoney(value: Money): string {
  const text = formatGbp(value), negative = text.startsWith("-");
  const [whole, decimal] = text.replace(/^-/, "").split(".");
  const digits = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (text === "0.00" && compareMoney(value, fromGbp("0")) !== 0) return `${compareMoney(value, fromGbp("0")) < 0 ? "−" : ""}less than £0.01`;
  return `${negative ? "−" : ""}£${digits}${decimal === "00" ? "" : `.${decimal}`}`;
}
export function formatChange(value: Money): string {
  const sign = compareMoney(value, fromGbp("0"));
  return sign === 0 ? "£0 — no change" : `${sign > 0 ? "+" : "−"}${formatMoney(absoluteMoney(value))}`;
}
/** Pure graphic scaling of exact magnitudes; bounded integer percent, never financial arithmetic. */
export function barPercent(value: Money, maximum: Money): number {
  const n = BigInt(value.numerator) * BigInt(maximum.denominator);
  const d = BigInt(value.denominator) * BigInt(maximum.numerator);
  return d > BigInt(0) && n > BigInt(0) ? Math.max(1, Math.min(100, Number(n * BigInt(100) / d))) : 0;
}
