import { describe, expect, it } from "vitest";
import {
  createEvidenceLoader, calculateScenario, calculateNetEmploymentIncome,
  evaluateSalaryPreservationEligibility, solveSalaryPreservation, SALARY_PRESERVATION_MAX_GROSS_GBP,
  fromGbp, addMoney, subtractMoney, compareMoney, multiplyMoney, diagnosticSchema,
  type ScenarioInput, type SalaryPreservationResult, type IncomeEvidenceLoader,
} from "@/engine";

const loader = createEvidenceLoader();
const monthly = (amountGbp: string) => ({ amountGbp, period: "MONTHLY" as const });
function input(salary = "50000", jurisdiction = "rUK"): ScenarioInput {
  return {
    household: { adults: 2, children: 0 },
    location: {
      cityId: "LOC-MAN", effectiveOn: "2026-09-14",
      housing: { bedrooms: 2, rentSourceMonth: "2026-07", overrides: {
        rent: monthly("1500"), councilTax: monthly("170"), energy: monthly("120"), water: monthly("55"),
      } },
      spending: { groceries: monthly("300"), essentials: monthly("80"), lifestyle: monthly("100") },
      transport: { status: "UNRESOLVED", override: monthly("70") },
      income: { grossAnnualSalaryGbp: salary, taxJurisdiction: jurisdiction, niCategory: "A", taxYear: "2026/27", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", calculationBasis: "ANNUAL_COMPARISON" },
    },
  };
}
const scenario = (q: ScenarioInput) => calculateScenario(loader, q);
function forward(salary: string, jurisdiction = "rUK") {
  const r = calculateNetEmploymentIncome(loader, {
    grossAnnualSalaryGbp: salary, jurisdiction, niCategory: "A", taxYear: "2026/27",
    scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", basis: "ANNUAL_COMPARISON", effectiveOn: "2026-09-14",
  });
  if (r.status !== "RESOLVED") throw new Error(JSON.stringify(r));
  return r;
}
const salaryText = (p: bigint) => `${p / BigInt(100)}.${String(p % BigInt(100)).padStart(2, "0")}`;
/** Every solved assertion reconciles against the public forward API and exact target. */
function checked(result: SalaryPreservationResult) {
  expect(result.status).toBe("ELIGIBLE_SOLVED");
  if (result.status !== "ELIGIBLE_SOLVED") throw new Error(JSON.stringify(result));
  const f = forward(result.requiredGrossAnnualSalaryGbp, result.taxJurisdiction);
  expect(result.requiredGrossAnnualSalary).toEqual(f.grossAnnual);
  expect(result.achievedNetMonthly).toEqual(f.netMonthlyEquivalent);
  expect(result.achievedNetAnnual).toEqual(f.netAnnual);
  expect(multiplyMoney(result.achievedNetMonthly, BigInt(12))).toEqual(f.netAnnual);
  expect(result.target.requiredDestinationNetMonthly).toEqual(addMoney(result.target.currentResidualMonthly, result.target.destinationCompleteMonthlyCost));
  expect(result.overshootMonthly).toEqual(subtractMoney(f.netMonthlyEquivalent, result.target.requiredDestinationNetMonthly));
  expect(result.achievedResidualMonthly).toEqual(subtractMoney(f.netMonthlyEquivalent, result.target.destinationCompleteMonthlyCost));
  expect(compareMoney(result.overshootMonthly, fromGbp("0"))).toBeGreaterThanOrEqual(0);
  expect(compareMoney(result.achievedResidualMonthly, result.target.currentResidualMonthly)).toBeGreaterThanOrEqual(0);
  expect(result.requiredGrossAnnualSalary.denominator).toBe("1");
  const pence = BigInt(result.requiredGrossAnnualSalary.numerator);
  expect(pence >= BigInt(0)).toBe(true);
  if (pence > BigInt(0)) {
    const prev = forward(salaryText(pence - BigInt(1)), result.taxJurisdiction);
    expect(compareMoney(prev.netMonthlyEquivalent, result.target.requiredDestinationNetMonthly)).toBe(-1);
    expect(result.minimality.previousPenny).toEqual({ status: "BELOW_TARGET", grossAnnual: prev.grossAnnual, netMonthly: prev.netMonthlyEquivalent });
  } else expect(result.minimality.previousPenny.status).toBe("NOT_APPLICABLE_ZERO_SALARY");
  expect(result.search.iterations).toBeLessThanOrEqual(23);
  expect(result.search.localPenceChecked).toBeLessThanOrEqual(200);
  expect(result.search.forwardEvaluations).toBeLessThanOrEqual(227);
  expect(result.classification).toBe("CALCULATED");
  expect(result.target.classification).toBe("CALCULATED");
  expect(result.minimality.guarantee).toBe("GLOBAL_MINIMUM_WITHIN_BOUNDS");
  expect(result.minimality.exactTargetMatch).toBe(compareMoney(result.overshootMonthly, fromGbp("0")) === 0);
  result.diagnostics.forEach((d) => expect(diagnosticSchema.safeParse(d).success).toBe(true));
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  return result;
}
function solve(current = input(), destination = input(), maximum?: string) {
  return solveSalaryPreservation(loader, scenario(current), scenario(destination), maximum === undefined ? {} : { maxGrossAnnualSalaryGbp: maximum });
}
function rejected(current: ScenarioInput, destination: ScenarioInput, reason: string) {
  const r = solve(current, destination);
  expect(r.status).toBe("INELIGIBLE");
  if (r.status !== "INELIGIBLE") throw new Error("expected ineligible");
  expect(r.reasons).toContain(reason);
  expect(r).not.toHaveProperty("requiredGrossAnnualSalary");
  expect(r).not.toHaveProperty("target");
  r.diagnostics.forEach((d) => expect(diagnosticSchema.safeParse(d).success).toBe(true));
}

describe("strict salary-preservation eligibility", () => {
  it("accepts complete overrides, with no existing destination salary or resolved destination income", () => {
    const d = input(); delete d.location.income.grossAnnualSalaryGbp;
    expect(scenario(d).completeness).toBe("UNRESOLVED");
    const eligibility = evaluateSalaryPreservationEligibility(loader, scenario(input()), scenario(d));
    expect(eligibility.status).toBe("ELIGIBLE");
    expect(checked(solve(input(), d)).requiredGrossAnnualSalaryGbp).toBe("50000.00");
  });
  it("accepts current net override and preserves its distinct lineage", () => {
    const c = input(); c.location.income = { netMonthlyIncomeOverride: monthly("2800") };
    const r = checked(solve(c));
    expect(r.target.currentResidualMonthly).toEqual(fromGbp("405"));
    expect(r.lineage.current.incomeResolutionSource).toBe("USER_OVERRIDE");
    expect(r.lineage.current.effectiveIncomeClassification).toBe("USER_ENTERED");
    expect(r.lineage.current.evidence.incomeBaseline).toEqual([]);
    expect(r.lineage.employmentReferenceReleases.map((r) => r.dataset)).toEqual(["incomeTax", "nationalInsurance"]);
    expect(r.lineage.employmentRecordIds.length).toBeGreaterThan(3);
  });
  it("rejects partial current costs/residual", () => {
    const c = input(); delete c.location.housing.overrides.energy;
    rejected(c, input(), "CURRENT_RESIDUAL_INCOMPLETE");
    rejected(c, input(), "CURRENT_COSTS_INCOMPLETE");
  });
  it("rejects unresolved current income", () => {
    const c = input(); c.location.income = {};
    rejected(c, input(), "CURRENT_INCOME_UNRESOLVED");
  });
  it.each([
    ["taxJurisdiction", "unsupported", "DESTINATION_TAX_JURISDICTION_UNSUPPORTED"],
    ["taxJurisdiction", undefined, "DESTINATION_TAX_JURISDICTION_UNSUPPORTED"],
    ["niCategory", "B", "DESTINATION_NI_UNSUPPORTED"],
    ["calculationBasis", "MONTHLY_PAYROLL", "DESTINATION_NI_UNSUPPORTED"],
    ["scope", "MULTIPLE_EMPLOYMENTS", "DESTINATION_EMPLOYMENT_UNSUPPORTED"],
    ["taxYear", "2027/28", "DESTINATION_EMPLOYMENT_UNSUPPORTED"],
    ["taxYear", undefined, "DESTINATION_EMPLOYMENT_UNSUPPORTED"],
  ] as const)("rejects unsupported destination %s=%s", (key, value, reason) => {
    const d = input(); d.location.income[key] = value;
    rejected(input(), d, reason);
  });
  it("rejects destination net override even with calculable gross", () => {
    const d = input(); d.location.income.netMonthlyIncomeOverride = monthly("0");
    rejected(input(), d, "DESTINATION_NET_OVERRIDE_CONFLICT");
  });
  it("retains forward evidence-date failure without solving", () => {
    const d = input(); d.location.effectiveOn = "2027-05-01";
    rejected(input(), d, "DESTINATION_EMPLOYMENT_UNSUPPORTED");
  });
  it("handles invalid scenario inputs without amounts", () => {
    const invalid = calculateScenario(loader, null);
    const r = solveSalaryPreservation(loader, invalid, invalid);
    expect(r.status).toBe("INELIGIBLE");
    expect(r).not.toHaveProperty("requiredGrossAnnualSalary");
  });
  it("accepts explicitly not-applicable transport", () => {
    const q = input(); q.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    checked(solve(q, q));
  });
  it.each([
    ["LOC-EDI", "rent"], ["LOC-LON", "councilTax"], ["LOC-BIR", "water"], ["LOC-MAN", "energy"],
  ] as const)("does not fill %s %s gaps and accepts an explicit replacement", (city, category) => {
    const d = input(); d.location.cityId = city; delete d.location.housing.overrides[category];
    rejected(input(), d, "DESTINATION_COSTS_INCOMPLETE");
    d.location.housing.overrides[category] = monthly("100");
    checked(solve(input(), d));
  });
  it.each(["groceries", "essentials", "lifestyle"] as const)("rejects missing %s", (category) => {
    const d = input(); delete d.location.spending[category];
    rejected(input(), d, "DESTINATION_COSTS_INCOMPLETE");
  });
  it("rejects unresolved transport", () => {
    const d = input(); d.location.transport = { status: "UNRESOLVED" };
    rejected(input(), d, "DESTINATION_COSTS_INCOMPLETE");
  });
  it("fails closed when valid forward references no longer support the block proof", () => {
    const changed: IncomeEvidenceLoader = { ...loader, getTaxReference: (q) => loader.getTaxReference(q).map((r) => r.ruleType === "tax_band" ? { ...r, rate: 0.9 } : r) };
    expect(calculateNetEmploymentIncome(changed, { grossAnnualSalaryGbp: "0", jurisdiction: "rUK", taxYear: "2026/27", niCategory: "A", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", basis: "ANNUAL_COMPARISON" }).status).toBe("RESOLVED");
    const r = solveSalaryPreservation(changed, scenario(input()), scenario(input()));
    expect(r).toMatchObject({ status: "INELIGIBLE", reasons: ["SALARY_SEARCH_REFERENCE_UNSUPPORTED"] });
  });
});

describe("exact solves and bounded search", () => {
  it("solves the standard rUK example exactly", () => {
    const r = checked(solve());
    expect(r.target.currentResidualMonthly).toEqual(fromGbp("898.30"));
    expect(r.target.destinationCompleteMonthlyCost).toEqual(fromGbp("2395"));
    expect(r.achievedNetMonthly).toEqual(fromGbp("3293.30"));
    expect(r.requiredGrossAnnualSalaryGbp).toBe("50000.00");
    expect(r.overshootMonthly).toEqual(fromGbp("0"));
  });
  it.each(["13000", "20000", "35000", "60000", "90000", "150000", "1000000"])("uses Scottish forward bands at £%s", (salary) => {
    const q = input(salary, "Scotland");
    expect(checked(solve(q, q)).requiredGrossAnnualSalaryGbp).toBe(`${salary}.00`);
  });
  it("reports positive discrete overshoot without rounding it away", () => {
    const d = input(); d.location.housing.overrides.rent = monthly("1500.01");
    const r = checked(solve(input(), d));
    expect(r.requiredGrossAnnualSalaryGbp).toBe("50000.17");
    expect(compareMoney(r.overshootMonthly, fromGbp("0"))).toBe(1);
    expect(r.overshootMonthly).toEqual(fromGbp("0.0002"));
  });
  it("preserves a negative £200 buffer with destination costs £1500", () => {
    const c = input(); c.location.income = { netMonthlyIncomeOverride: monthly("2000") };
    c.location.housing.overrides.rent = monthly("1305");
    const d = input(); d.location.housing.overrides.rent = monthly("605");
    const r = checked(solve(c, d));
    expect(r.target.currentResidualMonthly).toEqual(fromGbp("-200"));
    expect(r.target.requiredDestinationNetMonthly).toEqual(fromGbp("1300"));
  });
  it.each(["0", "-100"])("returns zero without searching for target %s", (target) => {
    const c = input(); c.location.income = { netMonthlyIncomeOverride: monthly("0") };
    const d = input(); d.location.housing.overrides.rent = monthly(target === "0" ? "1500" : "1400");
    const r = checked(solve(c, d, "0"));
    expect(r.target.requiredDestinationNetMonthly).toEqual(fromGbp(target));
    expect(r.requiredGrossAnnualSalaryGbp).toBe("0.00");
    expect(r.search).toMatchObject({ iterations: 0, localPenceChecked: 0, forwardEvaluations: 1 });
  });
  it.each(["0", "1.50", "49999.99", "50000.00"])("honours inclusive custom bound £%s", (maximum) => {
    const r = solve(input(), input(), maximum);
    if (maximum === "50000.00") checked(r);
    else {
      expect(r.status).toBe("NO_SOLUTION_WITHIN_BOUNDS");
      expect(r).not.toHaveProperty("requiredGrossAnnualSalary");
      if (r.status !== "NO_SOLUTION_WITHIN_BOUNDS") throw new Error("expected no solution");
      expect(r.search.forwardEvaluations).toBeLessThanOrEqual(3);
      r.diagnostics.forEach((d) => expect(diagnosticSchema.safeParse(d).success).toBe(true));
    }
  });
  it("returns no solution beyond the default operational cap", () => {
    const q = input("20000000"); const r = solve(q, q);
    expect(r.status).toBe("NO_SOLUTION_WITHIN_BOUNDS");
    if (r.status !== "NO_SOLUTION_WITHIN_BOUNDS") throw new Error("expected no solution");
    expect(r.search.operationalMaximum).toEqual(fromGbp(SALARY_PRESERVATION_MAX_GROSS_GBP));
    expect(r).not.toHaveProperty("achievedNetMonthly");
  });
  it.each(["-1", "0.001", "10000000.01", "NaN"])("rejects invalid operational configuration %s", (maximum) => {
    expect(() => solve(input(), input(), maximum)).toThrow();
  });
  it("does not mutate scenarios or sources and is deterministic", () => {
    const c = scenario(input("110000", "Scotland")), d = scenario(input("0", "Scotland"));
    const before = JSON.stringify([c, d, loader.metadata]);
    const first = checked(solveSalaryPreservation(loader, c, d));
    expect(checked(solveSalaryPreservation(loader, c, d))).toEqual(first);
    expect(JSON.stringify([c, d, loader.metadata])).toBe(before);
  });
});

describe("taper global minimum and envelope regressions", () => {
  it.each([["rUK", "100001.32"], ["Scotland", "100001.16"]])("records the lower salary for the £100002 target in %s", (jurisdiction, expected) => {
    const q = input("100002", jurisdiction);
    expect(checked(solve(q, q)).requiredGrossAnnualSalaryGbp).toBe(expected);
  });
  it("reconciles the high Scottish worked example", () => {
    const q = input("150000", "Scotland");
    const r = checked(solve(q, q));
    expect(r.achievedNetAnnual).toEqual(fromGbp("85355.05"));
    expect(r.achievedNetMonthly).toEqual(multiplyMoney(fromGbp("85355.05"), BigInt(1), BigInt(12)));
  });
  it("solves within a shortened first block", () => {
    const c = input(); c.location.income = { netMonthlyIncomeOverride: monthly("0.01") };
    expect(checked(solve(c, input(), "1.50")).requiredGrossAnnualSalaryGbp).toBe("0.12");
  });
  it("solves exactly at the default operational cap", () => {
    const q = input(SALARY_PRESERVATION_MAX_GROSS_GBP);
    expect(checked(solve(q, q)).requiredGrossAnnualSalaryGbp).toBe(SALARY_PRESERVATION_MAX_GROSS_GBP);
  });
  it("returns no solution when both the preceding maximum and truncated taper block fail", () => {
    const q = input("100003.99");
    expect(solve(q, q, "100002").status).toBe("NO_SOLUTION_WITHIN_BOUNDS");
  });
  it.each(["rUK", "Scotland"])("checks dense local forward oracles around each critical boundary in %s", (jurisdiction) => {
    for (const salary of ["99999.99", "100001.99", "100002", "110000", "125138", "125139.99", "125140", "125140.01", "125142"]) {
      const q = input(salary, jurisdiction);
      const r = checked(solve(q, q));
      const anchor = BigInt(fromGbp(salary).numerator);
      const target = forward(salary, jurisdiction).netMonthlyEquivalent;
      // Independent exhaustive oracle starts £4 before the target's salary, crossing two drops.
      let expected: bigint | undefined;
      for (let p = anchor - BigInt(400); p <= anchor; p++) {
        if (compareMoney(forward(salaryText(p), jurisdiction).netMonthlyEquivalent, target) >= 0) { expected = p; break; }
      }
      expect(r.requiredGrossAnnualSalaryGbp).toBe(salaryText(expected!));
      if (["100002", "110000", "125138", "125140"].includes(salary)) expect(compareMoney(r.requiredGrossAnnualSalary, fromGbp(salary))).toBe(-1);
    }
  });
  it.each(["rUK", "Scotland"])("finds lower satisfying salary even when the cap itself fails in %s", (jurisdiction) => {
    const c = input("100001.99", jurisdiction), d = input("0", jurisdiction);
    expect(compareMoney(forward("100002", jurisdiction).netMonthlyEquivalent, forward("100001.99", jurisdiction).netMonthlyEquivalent)).toBe(-1);
    const r = checked(solve(c, d, "100002"));
    expect(r.requiredGrossAnnualSalaryGbp).toBe("100001.99");
    expect(r.search.localPenceChecked).toBe(200);
  });
  it.each(["rUK", "Scotland"])("minimum salary never decreases as targets increase in %s", (jurisdiction) => {
    let previous = fromGbp("0");
    for (const net of ["0.01", "500", "1047.50", "1300", "3000", "5000", "5500", "5500.01", "5500.02", "6000", "7000", "10000", "100000"]) {
      const c = input(); c.location.income = { netMonthlyIncomeOverride: monthly(net) };
      const r = checked(solve(c, input("0", jurisdiction)));
      expect(compareMoney(r.requiredGrossAnnualSalary, previous)).toBeGreaterThanOrEqual(0);
      previous = r.requiredGrossAnnualSalary;
    }
  });
  it.each(["rUK", "Scotland"])("independently checks endpoint maxima across the entire taper in %s", (jurisdiction) => {
    let previous = forward("99999.99", jurisdiction).netMonthlyEquivalent;
    for (let p = BigInt(10000199); p <= BigInt(12514199); p += BigInt(200)) {
      const now = forward(salaryText(p), jurisdiction).netMonthlyEquivalent;
      expect(compareMoney(now, previous)).toBe(1);
      previous = now;
    }
  });
});
