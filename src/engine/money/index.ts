import { z } from "zod";

/** Exact rational pence. Strings keep results JSON-safe; arithmetic uses BigInt. */
export const moneySchema = z.strictObject({
  currency: z.literal("GBP"), unit: z.literal("pence"),
  numerator: z.string().regex(/^-?(0|[1-9]\d*)$/),
  denominator: z.string().regex(/^[1-9]\d*$/),
});
export type Money = Readonly<z.infer<typeof moneySchema>>;
const zero = BigInt(0);
const one = BigInt(1);
const abs = (n: bigint) => n < zero ? -n : n;
function fraction(n: bigint, d: bigint): Money {
  if (d <= zero) throw new Error("Money denominator must be positive");
  let a = abs(n), b = d;
  while (b !== zero) [a, b] = [b, a % b];
  return Object.freeze({ currency: "GBP", unit: "pence", numerator: String(n / a), denominator: String(d / a) });
}
export function fromGbp(decimal: string): Money {
  if (!/^-?\d+(\.\d+)?$/.test(decimal) || decimal.length > 128) throw new Error("GBP requires decimal text, without exponent or separators");
  const negative = decimal.startsWith("-");
  const [whole, digits = ""] = decimal.replace(/^-/, "").split(".");
  return fraction(BigInt(`${whole}${digits}`) * BigInt(100) * (negative ? -one : one), BigInt(10) ** BigInt(digits.length));
}
export function multiplyMoney(value: Money, numerator: bigint, denominator: bigint = one): Money {
  const m = moneySchema.parse(value);
  return fraction(BigInt(m.numerator) * numerator, BigInt(m.denominator) * denominator);
}
export function addMoney(left: Money, right: Money): Money {
  const a = moneySchema.parse(left), b = moneySchema.parse(right);
  return fraction(BigInt(a.numerator) * BigInt(b.denominator) + BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}
/** Mathematical equivalent, never an actual invoice or daily billing convention. */
export function monthlyEquivalent(amount: Money, period: "WEEKLY" | "ANNUAL" | "MONTHLY"): Money {
  switch (period) {
    case "WEEKLY": return multiplyMoney(amount, BigInt(52), BigInt(12));
    case "ANNUAL": return multiplyMoney(amount, one, BigInt(12));
    case "MONTHLY": return multiplyMoney(amount, one);
    default: throw new Error("Unsupported monthly period; daily charges require explicit dates");
  }
}
/** Inclusive UTC dates supplied by the caller. Result is for that interval, not a monthly equivalent. */
export function dailyChargeForPeriod(amount: Money, from: string, to: string): Money {
  z.iso.date().parse(from); z.iso.date().parse(to);
  if (from > to) throw new Error("Billing period is reversed");
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  return multiplyMoney(amount, BigInt(days));
}
/** Display only: nearest penny, half away from zero. Not a tax/NI rounding rule. */
export function formatGbp(value: Money): string {
  const m = moneySchema.parse(value), n = BigInt(m.numerator), d = BigInt(m.denominator);
  const rounded = (abs(n) * BigInt(2) + d) / (d * BigInt(2));
  return `${n < zero && rounded !== zero ? "-" : ""}${rounded / BigInt(100)}.${String(rounded % BigInt(100)).padStart(2, "0")}`;
}

export function subtractMoney(left: Money, right: Money): Money {
  return addMoney(left, multiplyMoney(right, -one));
}
export function compareMoney(left: Money, right: Money): -1 | 0 | 1 {
  const a = moneySchema.parse(left), b = moneySchema.parse(right);
  const difference = BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
  return difference < zero ? -1 : difference > zero ? 1 : 0;
}
export function minMoney(left: Money, right: Money): Money { return compareMoney(left, right) <= 0 ? left : right; }
export function maxMoney(left: Money, right: Money): Money { return compareMoney(left, right) >= 0 ? left : right; }
/** A dimensionless decimal rate, parsed exactly; never binary multiplication of GBP. */
export function applyDecimalRate(amount: Money, rate: string): Money {
  if (!/^\d+(\.\d+)?$/.test(rate) || rate.length > 128) throw new Error("Rate requires nonnegative decimal text");
  const [whole, decimal = ""] = rate.split(".");
  return multiplyMoney(amount, BigInt(`${whole}${decimal}`), BigInt(10) ** BigInt(decimal.length));
}
/** Explicit statutory boundary helper; callers must document why whole-pound ceiling applies. */
export function ceilWholeGbp(amount: Money): Money {
  const m = moneySchema.parse(amount), n = BigInt(m.numerator), d = BigInt(m.denominator) * BigInt(100);
  if (n < zero) throw new Error("Whole-pound allowance ceiling requires a nonnegative amount");
  return fromGbp(String((n + d - one) / d));
}
/** Exact magnitude in the existing rational-pence representation. */
export function absoluteMoney(value: Money): Money {
  const parsed = moneySchema.parse(value);
  return multiplyMoney(parsed, BigInt(parsed.numerator) < zero ? -one : one);
}
