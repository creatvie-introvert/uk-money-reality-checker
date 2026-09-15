import { gbpText, monthlyOverrideSchema, locationInputSchema, calculatorInputSchema } from "@/engine/contracts/input";
import { buildCalculatorInputsFromForm } from "./adapter";
import type { CalculatorFormState, FormLocation, ScenarioRole } from "./contracts";
import { cityLabels } from "./copy";

export const steps = ["start", "household", "income", "spending", "transport", "lifestyle", "review"] as const;
export type JourneyStep = typeof steps[number];
export const stepLabels: Record<JourneyStep, string> = { start: "Move setup", household: "Household & homes", income: "Income", spending: "Everyday spending", transport: "Transport", lifestyle: "Lifestyle", review: "Review" };
export const stepTitles: Record<JourneyStep, string> = { start: "Where are you moving?", household: "Tell us about your household and homes", income: "What do you earn now, and after the move?", spending: "How do your everyday costs look?", transport: "What will you spend on getting around?", lifestyle: "What lifestyle spending should we include?", review: "Check your move before we calculate" };
export const stepPath = (step: JourneyStep) => step === "start" ? "/calculator" : `/calculator/${step}`;
export const roles = ["current", "destination"] as const;
export const roleLabels = { current: "Where you live now", destination: "Where you’re moving" };
export type Field = { path: string; label: string; kind: "text" | "money" | "count" | "date" | "select" | "scope"; options?: readonly (readonly [string, string])[]; hint?: string; required?: boolean; positive?: boolean };
export type FieldError = { path: string; message: string; step: JourneyStep };
const options = (values: readonly string[]) => values.map((v) => [v, v] as const);
const bands = options(["A", "B", "C", "D", "E", "F", "G", "H"]);
// Explicit identities in the audited 2026/27 release; no charge values or auto-selection.
const authorities: Record<string, string> = { "LOC-BIR": "Birmingham", "LOC-BRS": "Bristol", "LOC-LIV": "Liverpool", "LOC-LEE": "Leeds", "LOC-MAN": "Manchester", "LOC-EDI": "City of Edinburgh", "LOC-GLA": "Glasgow City" };
export function emptyForm(): CalculatorFormState {
  const side = (): FormLocation => ({ cityId: "", effectiveOn: "", bedrooms: "", rentSourceMonth: "", rent: { mode: "UNKNOWN" }, council: { mode: "UNKNOWN" }, water: { mode: "UNKNOWN" }, energy: { mode: "UNKNOWN" }, spending: { groceries: { mode: "UNKNOWN" }, essentials: { mode: "UNKNOWN" }, lifestyle: { mode: "UNKNOWN" } }, transport: { mode: "UNKNOWN" }, income: { grossAnnualSalaryGbp: "", taxJurisdiction: "", taxYear: "", niCategory: "", scope: "", calculationBasis: "" } });
  return { household: { adults: "", children: "" }, current: side(), destination: side() };
}
export function fieldValue(form: CalculatorFormState, path: string): string {
  let value: unknown = form;
  for (const key of path.split(".")) value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
  return typeof value === "string" ? value : "";
}
/** Changes the canonical draft only. No engine-input mapping or financial arithmetic. */
export function changeField(form: CalculatorFormState, path: string, value: string): CalculatorFormState {
  const next = structuredClone(form), keys = path.split(".");
  let target = next as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) { target[key] ??= {}; target = target[key] as Record<string, unknown>; }
  const key = keys.at(-1)!;
  if (key === "mode") {
    const previous = { ...target };
    for (const existing of Object.keys(target)) delete target[existing];
    target.mode = value || "UNKNOWN";
    if (value === "AMOUNT") target.amountGbp = "";
    if (value === "SOURCE" && path.includes("council")) Object.assign(target, { authorityName: "", band: "" });
    if (value === "SOURCE" && path.includes("water")) Object.assign(target, { band: "", connectedServices: "" });
    if (value === "AMOUNT" && previous.mode === "SOURCE") {
      if (keys.includes("council") && previous.authorityName && previous.band) target.selection = { authorityName: previous.authorityName, band: previous.band };
      if (keys.includes("water") && previous.band && previous.connectedServices) target.selection = { band: previous.band, connectedServices: previous.connectedServices };
    }
    if (value === "SOURCE" && previous.mode === "AMOUNT" && previous.selection) Object.assign(target, previous.selection);
  } else if (key === "scope") Object.assign(target, { scope: value, niCategory: value ? "A" : "", calculationBasis: value ? "ANNUAL_COMPARISON" : "" });
  else if (key === "amountGbp" && path.includes("netOverride")) {
    const role = keys[0] as ScenarioRole;
    if (value === "") delete next[role].income.netOverride;
    else target.amountGbp = value;
  } else if (key === "amountGbp" && !["rent", "council", "water", "transport"].some((part) => keys.includes(part))) {
    if (value === "") { delete target.amountGbp; target.mode = "UNKNOWN"; }
    else Object.assign(target, { mode: "AMOUNT", amountGbp: value });
  } else target[key] = value;
  return next;
}
export function stepFields(form: CalculatorFormState, step: JourneyStep, role?: ScenarioRole): Field[] {
  if (!role) return step === "household" ? [{ path: "household.adults", label: "Adults", kind: "count", required: true }, { path: "household.children", label: "Children aged under 18", kind: "count", required: true }] : [];
  const q = form[role], p = (path: string) => `${role}.${path}`;
  const select = (path: string, label: string, items: Field["options"], hint?: string, required = false): Field => ({ path: p(path), label, kind: "select", options: items, hint, required });
  const money = (path: string, label: string, positive = false, hint?: string, required = false): Field => ({ path: p(path), label, kind: "money", positive, hint, required });
  const cost = (path: string, label: string, positive = false) => money(`${path}.amountGbp`, `${label} (£/month)`, positive, "Leave blank if unknown. This cost will remain unresolved; no automatic estimate is made.");
  if (step === "start") return [select("cityId", "City", Object.entries(cityLabels), undefined, true)];
  if (step === "household") return [
    select("bedrooms", "Bedrooms", [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4 or more"]], "Published rent uses the bedroom band, not a property type.", true),
    { path: p("effectiveOn"), label: "Evidence applicability date", kind: "date", required: true, hint: "The date for checking source applicability, not your move date. Sources have different effective periods." },
    select("rentSourceMonth", "Rent source period", [["2026-07", "July 2026"]], "Select the pinned source period, including for baseline context when entering your rent.", true),
    select("rent.mode", "Rent basis", [["SOURCE", "Use published rent for these inputs"], ["AMOUNT", "Enter my monthly rent"]], "Edinburgh has no resolved published rent; selecting that source can produce a partial result.", true),
    ...(q.rent.mode === "AMOUNT" ? [money("rent.amountGbp", "Rent (£/month)", true, undefined, true)] : []),
    select("council.mode", "Council tax basis", [["UNKNOWN", "I don’t know yet"], ...(authorities[q.cityId] ? [["SOURCE", "Select authority and band"] as const] : []), ["AMOUNT", "Enter my monthly council tax"]], "No borough, band, discount or London default is assumed."),
    ...(q.council.mode === "SOURCE" ? [select("council.authorityName", "Council authority", authorities[q.cityId] ? options([authorities[q.cityId]]) : [], "Select only if this is your actual authority; otherwise enter your bill."), select("council.band", "Council tax band", bands)] : []),
    ...(q.council.mode === "AMOUNT" ? [money("council.amountGbp", "Council tax (£/month)", true, undefined, true)] : []),
  ];
  if (step === "income") return [
    money("income.grossAnnualSalaryGbp", "Gross annual salary (£/year)", false, "One employee’s salary. Leave blank if unknown; destination salary is never copied automatically."),
    select("income.taxJurisdiction", "Tax jurisdiction", [["rUK", "England/Wales/Northern Ireland tax rates"], ["Scotland", "Scottish tax rates"]], "Confirm your taxpayer status. Your selected city does not determine it."),
    select("income.taxYear", "Income tax year", [["2026/27", "2026/27"]]),
    { path: p("income.scope"), label: "I confirm one employee, one employment, Class 1 category A NI and an annual comparison", kind: "scope", hint: "This simplified calculation excludes pensions, student loans and other payroll deductions. Actual payroll may differ." },
    money("income.netOverride.amountGbp", "Actual take-home override (£/month)", false, "Optional: use actual net income while retaining any gross baseline. A destination override prevents the salary-preservation solver. Clear this field to remove it."),
  ];
  if (step === "spending") return [cost("spending.groceries", "Groceries", true), cost("spending.essentials", "Household essentials"), cost("energy", "Energy", true),
    select("water.mode", "Water basis", [["UNKNOWN", "I don’t know yet"], ...(["LOC-EDI", "LOC-GLA"].includes(q.cityId) ? [["SOURCE", "Scottish unmetered council-band charge"] as const] : []), ["AMOUNT", "Enter my monthly water bill"]], "English tariff evidence alone does not determine your bill. Birmingham applicability stays unresolved without a supported input."),
    ...(q.water.mode === "AMOUNT" ? [money("water.amountGbp", "Water (£/month)", true, undefined, true)] : []),
    ...(q.water.mode === "SOURCE" ? [select("water.band", "Water property band", bands), select("water.connectedServices", "Connected water services", [["combined", "Clean water and wastewater"], ["clean_water", "Clean water only"], ["wastewater", "Wastewater only"]], "Confirm the services connected to this property. Council tax and water bands must agree.")] : []),
  ];
  if (step === "transport") return [select("transport.mode", "Transport cost basis", [["UNKNOWN", "I don’t know yet"], ["AMOUNT", "Enter my monthly household transport cost"], ["NONE", "I have no transport cost"]], "No journey frequency or fare is assumed. Fare-product selection is not available in this journey yet."), ...(q.transport.mode === "AMOUNT" ? [money("transport.amountGbp", "Transport (£/month)", false, "Include the household transport costs you want represented. Explicit £0 is supported.", true)] : [])];
  if (step === "lifestyle") return [cost("spending.lifestyle", "Lifestyle")];
  return [];
}
/** Scoped field checks reuse engine scalar schemas; the existing adapter remains the result gate. */
export function validateStep(form: CalculatorFormState, step: JourneyStep): FieldError[] {
  const errors: FieldError[] = [];
  for (const f of [...stepFields(form, step), ...roles.flatMap((r) => stepFields(form, step, r))]) {
    const value = fieldValue(form, f.path).trim();
    const add = (message: string) => errors.push({ path: f.path, message, step });
    if (f.required && (!value || (f.path.endsWith("rent.mode") && value === "UNKNOWN"))) { add(`Choose or enter ${f.label.toLowerCase()}.`); continue; }
    if (!value) continue;
    if (f.kind === "money" && !(f.positive ? monthlyOverrideSchema.shape.amountGbp : gbpText).safeParse(value).success) add(`Enter ${f.positive ? "a positive" : "a nonnegative"} amount in pounds, with at most two decimal places.`);
    if (f.kind === "count") {
      const key = f.path.endsWith("adults") ? "adults" : "children";
      if (!/^\d+$/.test(value) || !calculatorInputSchema.shape.household.shape[key].safeParse(Number(value)).success) add(`Enter a whole number of ${key}${key === "adults" ? " (at least one)" : " (zero or more)"}.`);
    }
    if (f.kind === "date" && !locationInputSchema.shape.effectiveOn.safeParse(value).success) add("Enter a valid calendar date.");
    if (f.kind === "select" && !f.options?.some(([option]) => option === value)) add(`Choose a supported ${f.label.toLowerCase()}.`);
  }
  if (step === "income") for (const role of roles) {
    const q = form[role].income;
    if (q.grossAnnualSalaryGbp.trim() && !q.netOverride) for (const [key, label] of [["taxJurisdiction", "tax jurisdiction"], ["taxYear", "income tax year"], ["scope", "supported employment scope"]] as const) {
      if (!q[key]) errors.push({ path: `${role}.income.${key}`, message: `Confirm the ${label} to calculate salary-based take-home, or enter actual take-home.`, step });
    }
  }
  return errors;
}
export function validateJourney(form: CalculatorFormState): FieldError[] {
  const errors = steps.flatMap((step) => validateStep(form, step));
  const adapted = buildCalculatorInputsFromForm(form);
  if (!errors.length) for (const role of roles) if (adapted[role].state !== "READY") for (const issue of adapted[role].issues) errors.push({ path: issue.path?.join(".") ?? role, message: "Review this input; it is not valid for the supported calculator.", step: "household" });
  return errors;
}
function retainedBaselineRows(form: CalculatorFormState, step: JourneyStep, role?: ScenarioRole) {
  if (!role) return [];
  const council = form[role].council, water = form[role].water;
  if (step === "household" && council.mode === "AMOUNT" && council.selection) return [{ label: "Retained council source context", value: `${council.selection.authorityName} · Band ${council.selection.band}` }];
  if (step === "spending" && water.mode === "AMOUNT" && water.selection) return [{ label: "Retained water source context", value: `Band ${water.selection.band} · ${water.selection.connectedServices === "combined" ? "Clean water and wastewater" : water.selection.connectedServices === "clean_water" ? "Clean water only" : "Wastewater only"}` }];
  return [];
}
export function reviewSections(form: CalculatorFormState) {
  return steps.filter((s) => s !== "review").map((step) => ({ step, label: stepLabels[step], groups: [undefined, ...roles].map((role) => ({ label: role ? roleLabels[role] : "Moving together", rows: stepFields(form, step, role).map((f) => {
    const value = fieldValue(form, f.path);
    return { label: f.label, value: !value && f.path.endsWith("netOverride.amountGbp") ? "Not used — use salary calculation where supported" : !value || value === "UNKNOWN" ? "Not supplied / unresolved" : f.kind === "scope" ? "Confirmed" : f.kind === "select" ? f.options?.find(([v]) => v === value)?.[1] ?? "Selection needs review" : f.kind === "money" ? `£${value} — your entered amount` : value };
  }).concat(retainedBaselineRows(form, step, role)) })).filter((g) => g.rows.length) })).flatMap((section) => section.step === "household" ? [{ ...section, label: "Household", groups: section.groups.slice(0, 1) }, { ...section, label: "Housing & council tax", groups: section.groups.slice(1) }] : [section]);
}
