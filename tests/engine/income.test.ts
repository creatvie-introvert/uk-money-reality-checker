import { describe, expect, it } from "vitest";
import {
  createEvidenceLoader, calculateIncomeTax, calculateEmployeeNi, calculateNetEmploymentIncome,
  fromGbp, addMoney, subtractMoney, multiplyMoney, compareMoney, applyDecimalRate, ceilWholeGbp,
  categoryCalculators, normalizeCalculatorInput,
  type IncomeEvidenceLoader, type NetEmploymentRequest, type IncomeTaxRequest, type EmployeeNiRequest,
  type Money, type CalculatorInput,
} from "@/engine";
import { incomeVectors } from "./fixtures/income-vectors";

const loader = createEvidenceLoader();
const common = { scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", basis: "ANNUAL_COMPARISON", taxYear: "2026/27" } as const;
const request = (salary: string, jurisdiction: "rUK" | "Scotland" = "rUK"): NetEmploymentRequest => ({ ...common, grossAnnualSalaryGbp: salary, jurisdiction, niCategory: "A" });
function tax(salary: string, jurisdiction: "rUK" | "Scotland" = "rUK", evidence: IncomeEvidenceLoader = loader) {
  const { niCategory, ...q } = request(salary,jurisdiction); void niCategory;
  const result=calculateIncomeTax(evidence,q);
  if(result.status!=="RESOLVED") throw new Error(JSON.stringify(result));
  return result;
}
function ni(salary: string, evidence: IncomeEvidenceLoader = loader) {
  const { jurisdiction, ...q }=request(salary); void jurisdiction;
  const result=calculateEmployeeNi(evidence,q);
  if(result.status!=="RESOLVED") throw new Error(JSON.stringify(result));
  return result;
}
function net(salary: string, jurisdiction: "rUK" | "Scotland" = "rUK") {
  const result=calculateNetEmploymentIncome(loader,request(salary,jurisdiction));
  if(result.status!=="RESOLVED") throw new Error(JSON.stringify(result));
  return result;
}
const sum = (xs: readonly Money[]) => xs.reduce(addMoney,fromGbp("0"));
const pounds = (pence: number) => `${Math.floor(pence/100)}.${String(pence%100).padStart(2,"0")}`;

describe("independent annual income QA vectors", () => {
  it.each(incomeVectors)("$jurisdiction £$salary: complete exact breakdown", (v) => {
    const r=net(v.salary,v.jurisdiction);
    expect(r.incomeTax).toEqual(fromGbp(v.tax));
    expect(r.employeeNi).toEqual(fromGbp(v.ni));
    expect(r.netAnnual).toEqual(fromGbp(v.net));
    expect(multiplyMoney(r.netMonthlyEquivalent,BigInt(12))).toEqual(r.netAnnual);
    expect(sum(r.taxBreakdown.bands.map((b)=>b.tax))).toEqual(r.incomeTax);
    expect(sum(r.taxBreakdown.bands.map((b)=>b.taxableAmount))).toEqual(r.taxableIncome);
    expect(sum(r.niBreakdown.bands.map((b)=>b.employeeNi))).toEqual(r.employeeNi);
    expect(addMoney(sum(r.niBreakdown.bands.map((b)=>b.contributableEarnings)),r.niBreakdown.earningsBelowLowerEarningsLimit)).toEqual(r.grossAnnual);
    expect(addMoney(addMoney(r.netAnnual,r.incomeTax),r.employeeNi)).toEqual(r.grossAnnual);
  });
});

describe("allowance and taxable income", () => {
  it.each(["rUK","Scotland"] as const)("handles valid zero/low income in %s", (jurisdiction) => {
    for(const amount of ["0","1","6707.99","6708","12569.99","12570"]) {
      const r=net(amount,jurisdiction);
      expect(r.incomeTax).toEqual(fromGbp("0")); expect(r.employeeNi).toEqual(fromGbp("0"));
      expect(r.netAnnual).toEqual(fromGbp(amount));
    }
    expect(tax("12570.01",jurisdiction).taxableIncome).toEqual(fromGbp("0.01"));
    expect(tax("12570.01",jurisdiction).incomeTax).toEqual(fromGbp(jurisdiction==="rUK"?"0.002":"0.0019"));
    expect(ni("12570.01").employeeNi).toEqual(fromGbp("0.0008"));
  });
  it.each([
    ["99999.99","12570"],["100000","12570"],["100000.01","12570"],["100001","12570"],
    ["100001.99","12570"],["100002","12569"],["100002.01","12569"],
    ["110000","7570"],["120000","2570"],["125138","1"],["125139.99","1"],["125140","0"],["125140.01","0"],
  ])("uses statutory whole-pound remaining allowance at £%s", (salary,expected) => {
    for(const jurisdiction of ["rUK","Scotland"] as const) {
      const r=tax(salary,jurisdiction);
      expect(r.personalAllowance.effective).toEqual(fromGbp(expected));
      expect(addMoney(r.personalAllowance.effective,r.personalAllowance.reduction)).toEqual(r.personalAllowance.beforeTaper);
      expect(compareMoney(r.personalAllowance.effective,fromGbp("0"))).toBeGreaterThanOrEqual(0);
      expect(compareMoney(r.taxableIncome,fromGbp("0"))).toBeGreaterThanOrEqual(0);
    }
  });
  it("keeps unrounded taper and the statutory allowance distinct", () => {
    const a=tax("100000.01").personalAllowance;
    expect(a.unroundedReduction).toEqual(fromGbp("0.005"));
    expect(a.unroundedAllowance).toEqual(fromGbp("12569.995"));
    expect(a.reduction).toEqual(fromGbp("0"));expect(a.effective).toEqual(fromGbp("12570"));
    expect(ceilWholeGbp(fromGbp("0.005"))).toEqual(fromGbp("1"));
  });
  it.each(["rUK","Scotland"] as const)("documents the genuine penny-level taper discontinuity in %s", (jurisdiction) => {
    const before=net("100001.99",jurisdiction), after=net("100002",jurisdiction);
    expect(compareMoney(after.netAnnual,before.netAnnual)).toBe(-1);
    expect(subtractMoney(after.netAnnual,before.netAnnual)).toEqual(fromGbp(jurisdiction==="rUK"?"-0.3942":"-0.4447"));
    // The increase over a full £2 taper step remains positive.
    expect(compareMoney(net("100003.99",jurisdiction).netAnnual,before.netAnnual)).toBe(1);
  });
});

const taxBoundaries = [
  { jurisdiction:"rUK", thresholds:[12570,50270,100000,125140], limits:["37700","125140"] },
  { jurisdiction:"Scotland", thresholds:[12570,16537,29526,43662,75000,100000,125140], limits:["3967","16956","31092","62430","125140"] },
] as const;
describe("continuous tax band allocation", () => {
  for(const {jurisdiction,thresholds,limits} of taxBoundaries) {
    it(`${jurisdiction}: converts published illustrations to approved taxable limits`, () => {
      expect(tax("200000",jurisdiction).bands.slice(0,-1).map((b)=>b.upperInclusive)).toEqual(limits.map(fromGbp));
    });
    for(const threshold of thresholds) it(`${jurisdiction}: £${threshold} minus/exact/plus one penny`, () => {
      for(const delta of [-1,0,1]) {
        const r=tax(pounds(threshold*100+delta),jurisdiction);
        expect(sum(r.bands.map((b)=>b.taxableAmount))).toEqual(r.taxableIncome);
        expect(sum(r.bands.map((b)=>b.tax))).toEqual(r.incomeTax);
        for(let i=0;i<r.bands.length;i++) {
          const b=r.bands[i];expect(compareMoney(b.taxableAmount,fromGbp("0"))).toBeGreaterThanOrEqual(0);
          if(i>0) expect(b.lowerExclusive).toEqual(r.bands[i-1].upperInclusive);
          expect(b.tax).toEqual(applyDecimalRate(b.taxableAmount,b.rate));
        }
      }
    });
    for(const [index,threshold] of thresholds.filter((t)=>t<100000).entries()) it(`${jurisdiction}: next penny above £${threshold} reaches its next band`, () => {
      const exact=tax(String(threshold),jurisdiction), above=tax(`${threshold}.01`,jurisdiction);
      expect(subtractMoney(above.incomeTax,exact.incomeTax)).toEqual(applyDecimalRate(fromGbp("0.01"),above.bands[index].rate));
    });
  }
  it.each(["125140","125140.01","125141"])("preserves Scottish top-band behavior at £%s", (salary) => {
    const r=tax(salary,"Scotland"), top=r.bands.at(-1)!;
    expect(top.lowerExclusive).toEqual(fromGbp("125140"));
    expect(top.taxableAmount).toEqual(subtractMoney(fromGbp(salary),fromGbp("125140")));
    expect(r.bands.at(-2)!.upperInclusive).toEqual(fromGbp("125140"));
    expect(top.rate).toBe("0.48");
    expect(sum(r.bands.map((b)=>b.taxableAmount))).toEqual(r.taxableIncome);
  });
  it("does not subtract the standard allowance from the final top-rate threshold", () => {
    expect(tax("120000").bands.at(-1)!.taxableAmount).toEqual(fromGbp("0"));
    expect(tax("120000","Scotland").bands.at(-1)!.taxableAmount).toEqual(fromGbp("0"));
    expect(tax("110000").incomeTax).toEqual(fromGbp("33432"));
  });
});

describe("official annual category A NI", () => {
  it.each([6708,12570,50270])("allocates around £%s with no gaps or duplicate earnings", (threshold) => {
    for(const delta of [-1,0,1]) {
      const r=ni(pounds(threshold*100+delta));
      expect(addMoney(r.earningsBelowLowerEarningsLimit,sum(r.bands.map((b)=>b.contributableEarnings)))).toEqual(r.grossAnnual);
      expect(sum(r.bands.map((b)=>b.employeeNi))).toEqual(r.employeeNi);
      expect(compareMoney(r.employeeNi,fromGbp("0"))).toBeGreaterThanOrEqual(0);
    }
  });
  it("uses 8% above PT and 2% above UEL exactly, without payroll rounding", () => {
    expect(ni("12570").employeeNi).toEqual(fromGbp("0"));
    expect(ni("12570.01").employeeNi).toEqual(fromGbp("0.0008"));
    expect(ni("50270").employeeNi).toEqual(fromGbp("3016"));
    expect(ni("50270.01").employeeNi).toEqual(fromGbp("3016.0002"));
    expect(ni("150000").employeeNi).toEqual(fromGbp("5010.6"));
  });
  it("requests official annual rows rather than deriving from weekly or monthly thresholds", () => {
    const calls: string[]=[];
    const evidence: IncomeEvidenceLoader={...loader,getNiReference:(q)=>{calls.push(q.payPeriod);return loader.getNiReference(q);}};
    const r=ni("50000",evidence);
    expect(calls).toEqual(["annual"]);expect(r.referencePayPeriod).toBe("annual");
    expect(r.bands[0].upperThreshold).toEqual(fromGbp("12570"));
    expect(multiplyMoney(fromGbp("1048"),BigInt(12))).not.toEqual(r.bands[0].upperThreshold);
    expect(r.diagnostics[0].code).toBe("ANNUALISED_NI_COMPARISON");
  });
});

describe("business failures remain structured unresolved", () => {
  const taxInput: IncomeTaxRequest={...common,grossAnnualSalaryGbp:"30000",jurisdiction:"rUK"};
  const niInput: EmployeeNiRequest={...common,grossAnnualSalaryGbp:"30000",niCategory:"A"};
  it.each([
    [{...taxInput,jurisdiction:undefined},"TAX_JURISDICTION_REQUIRED"],
    [{...taxInput,jurisdiction:"unknown"},"TAX_JURISDICTION_UNSUPPORTED"],
    [{...taxInput,taxYear:"2027/28"},"TAX_REFERENCE_MISSING"],
    [{...taxInput,grossAnnualSalaryGbp:"-1"},"INCOME_OUT_OF_SCOPE"],
    [{...taxInput,grossAnnualSalaryGbp:"0.001"},"INCOME_OUT_OF_SCOPE"],
    [{...taxInput,grossAnnualSalaryGbp:"1e9"},"INCOME_OUT_OF_SCOPE"],
    [{...taxInput,grossAnnualSalaryGbp:"9".repeat(129)},"INCOME_OUT_OF_SCOPE"],
    [{...taxInput,scope:"DIRECTOR"},"INCOME_OUT_OF_SCOPE"],
    [{...taxInput,pensionGbp:"100"},"INCOME_OUT_OF_SCOPE"],
    [{...taxInput,effectiveOn:"2027-04-06"},"TAX_REFERENCE_INVALID"],
  ])("rejects unsupported tax input %#", (q,code) => {
    const r=calculateIncomeTax(loader,q);expect(r.status).toBe("UNRESOLVED");expect(r.diagnostics[0].code).toBe(code);expect(r).not.toHaveProperty("incomeTax");
  });
  it.each([
    [{...niInput,niCategory:"B"},"NI_CATEGORY_UNSUPPORTED"],
    [{...niInput,taxYear:"2027/28"},"NI_REFERENCE_MISSING"],
    [{...niInput,basis:"MONTHLY_PAYROLL"},"INCOME_OUT_OF_SCOPE"],
    [{...niInput,grossAnnualSalaryGbp:"-1"},"INCOME_OUT_OF_SCOPE"],
  ])("rejects unsupported NI input %#", (q,code) => {
    const r=calculateEmployeeNi(loader,q);expect(r.status).toBe("UNRESOLVED");expect(r.diagnostics[0].code).toBe(code);expect(r).not.toHaveProperty("employeeNi");
  });
  it.each(["tax","ni"])("does not fill missing or duplicate %s records", (family) => {
    for(const failure of ["missing","duplicate","invalid"] as const) {
      const evidence: IncomeEvidenceLoader={...loader,
        getTaxReference:(q)=>{const rs=loader.getTaxReference(q);return failure==="missing"?rs.slice(1):failure==="duplicate"?[...rs,rs[0]]:rs.map((r)=>({...r,thresholdBasis:"allowance_amount" as const}));},
        getNiReference:(q)=>{const rs=loader.getNiReference(q);return failure==="missing"?rs.slice(1):failure==="duplicate"?[...rs,rs[0]]:rs.map((r)=>({...r,payPeriod:"monthly" as const}));},
      };
      const r=family==="tax"?calculateIncomeTax(evidence,taxInput):calculateEmployeeNi(evidence,niInput);
      expect(r.status).toBe("UNRESOLVED");expect(r.diagnostics[0].severity).toBe("blocking");
      expect(r.diagnostics[0].code).toBe(`${family==="tax"?"TAX":"NI"}_REFERENCE_${failure==="duplicate"?"AMBIGUOUS":failure==="missing"?"MISSING":"INVALID"}`);
    }
  });
  it("returns no partial take-home when either reference family fails", () => {
    const r=calculateNetEmploymentIncome(loader,{...request("30000"),niCategory:"B"});
    expect(r.status).toBe("UNRESOLVED");expect(r).not.toHaveProperty("netAnnual");expect(r).not.toHaveProperty("netMonthlyEquivalent");
  });
  it("reads thresholds/rates from the loader rather than a hidden numeric table", () => {
    const evidence: IncomeEvidenceLoader={...loader,getNiReference:(q)=>loader.getNiReference(q).map((r)=>r.bandName==="PT_TO_UEL"?{...r,employeeRate:0.09}:r)};
    expect(ni("30000",evidence).employeeNi).toEqual(fromGbp("1568.7"));
    const changed: IncomeEvidenceLoader={...loader,getTaxReference:(q)=>loader.getTaxReference(q).map((r)=>r.bandName==="basic"?{...r,rate:0.25}:r)};
    expect(tax("30000","rUK",changed).incomeTax).toEqual(fromGbp("4357.5"));
  });
});

describe("classification, lineage and category integration", () => {
  it("retains source records, periods/releases, input classification and exact reproducibility", () => {
    const r=net("125140.01","Scotland");
    expect(r.classification).toBe("CALCULATED");expect(r.taxBreakdown.classification).toBe("CALCULATED");expect(r.niBreakdown.classification).toBe("CALCULATED");
    expect(r.lineageClassifications).toEqual(["USER_ENTERED","OBSERVED_DATA","CALCULATED"]);
    expect(r.referenceRelease.map((r)=>r.releaseId)).toEqual(["ukmr-income-tax-2026-27-v1","ukmr-national-insurance-2026-27-v1"]);
    expect(r.evidenceLineage).toHaveLength(12);
    expect(r.evidenceLineage.every((e)=>e.valueType==="OBSERVED_DATA"&&e.taxYear==="2026/27"&&e.provenance.sourceId&&e.provenance.snapshotId)).toBe(true);
    expect(net("125140.01","Scotland")).toEqual(r);expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
  it("does not mutate input or loader records", () => {
    const q=request("110000","Scotland"), original=structuredClone(q), before=JSON.stringify(loader.getTaxReference({jurisdiction:"Scotland",taxYear:"2026/27"}));
    calculateNetEmploymentIncome(loader,q);expect(q).toEqual(original);
    expect(JSON.stringify(loader.getTaxReference({jurisdiction:"Scotland",taxYear:"2026/27"}))).toBe(before);
  });
  it("wires annual comparisons into both category interfaces without silently using a net override", () => {
    const location: CalculatorInput["currentLocation"]={cityId:"LOC-LON",effectiveOn:"2026-09-14",housing:{bedrooms:2,rentSourceMonth:"2026-07",overrides:{}},income:{scope:"ONE_EMPLOYEE_ONE_EMPLOYMENT",calculationBasis:"ANNUAL_COMPARISON",grossAnnualSalaryGbp:"30000",taxYear:"2026/27",taxJurisdiction:"rUK",niCategory:"A",payPeriod:"monthly",netMonthlyIncomeOverride:{amountGbp:"1",period:"MONTHLY"}},transport:{status:"UNRESOLVED"},spending:{}};
    const parsed=normalizeCalculatorInput({household:{adults:1,children:0},currentLocation:location,destinationLocation:location},loader);
    if(parsed.status!=="VALID") throw new Error("fixture invalid");
    const context={household:parsed.input.household,location:parsed.input.currentLocation,evidence:loader};
    const t=categoryCalculators.income_tax(context), n=categoryCalculators.national_insurance(context);
    expect(t.status).toBe("RESOLVED");expect(n.status).toBe("RESOLVED");
    if(t.status!=="RESOLVED"||n.status!=="RESOLVED") throw new Error("unexpected failure");
    expect(multiplyMoney(t.monthlyAmount,BigInt(12))).toEqual(fromGbp("3486"));expect(multiplyMoney(n.monthlyAmount,BigInt(12))).toEqual(fromGbp("1394.4"));
    expect(t.incomeBreakdown).toHaveProperty("bands");expect(n.incomeBreakdown).toHaveProperty("bands");
    const withoutJurisdiction={...context,location:{...context.location,income:{...context.location.income,taxJurisdiction:undefined}}};
    expect(categoryCalculators.income_tax(withoutJurisdiction).status).toBe("UNRESOLVED");
  });
});

describe("deterministic invariant ranges", () => {
  it.each(["rUK","Scotland"] as const)("reconciles and remains monotone over whole £100 steps in %s", (jurisdiction) => {
    let previous=fromGbp("0"), previousAllowance=fromGbp("12570");
    for(let salary=0;salary<=300000;salary+=100) {
      const r=net(String(salary),jurisdiction);
      expect(compareMoney(r.incomeTax,fromGbp("0"))).toBeGreaterThanOrEqual(0);
      expect(compareMoney(r.employeeNi,fromGbp("0"))).toBeGreaterThanOrEqual(0);
      expect(compareMoney(r.netAnnual,fromGbp("0"))).toBeGreaterThanOrEqual(0);
      expect(compareMoney(r.netAnnual,r.grossAnnual)).toBeLessThanOrEqual(0);
      expect(compareMoney(r.netAnnual,previous)).toBeGreaterThanOrEqual(0);
      expect(compareMoney(r.personalAllowance.effective,previousAllowance)).toBeLessThanOrEqual(0);
      expect(sum(r.taxBreakdown.bands.map((b)=>b.taxableAmount))).toEqual(r.taxableIncome);
      expect(addMoney(addMoney(r.netAnnual,r.incomeTax),r.employeeNi)).toEqual(r.grossAnnual);
      previous=r.netAnnual;previousAllowance=r.personalAllowance.effective;
    }
  },20000);
});
