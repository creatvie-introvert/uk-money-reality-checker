import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import {
  createEvidenceLoader, validateDataset, EvidenceLoadError, fromGbp, addMoney, multiplyMoney,
  monthlyEquivalent, dailyChargeForPeriod, formatGbp, normalizeCalculatorInput,
  resolveRent, resolveCouncilTax, resolveTaxReference, resolveNiReference,
  calculateRent, calculateCouncilTax, categoryCalculators, categorySchema,
  type CalculatorInput, type Category, type CategoryCalculatorContext,
} from "@/engine";
import { activeDatasets, type DatasetKey } from "@/engine/loaders/datasets";

const loader = createEvidenceLoader();
const location = (cityId: CalculatorInput["currentLocation"]["cityId"]): CalculatorInput["currentLocation"] => ({
  cityId, effectiveOn: "2026-09-14", housing: { bedrooms: 2, rentSourceMonth: "2026-07", overrides: {} },
  income: { grossAnnualSalaryGbp: "40000.00", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", taxYear: "2026/27", niCategory: "A", payPeriod: "monthly" },
  transport: { status: "UNRESOLVED" }, spending: {},
});
const input = (): CalculatorInput => ({ household: { adults: 2, children: 0 }, currentLocation: location("LOC-LON"), destinationLocation: location("LOC-EDI") });
const override = { amountGbp: "987.65", period: "MONTHLY" } as const;
const rentRequest = { cityId: "LOC-GLA", bedrooms: 2, sourcePeriod: "2026-07" } as const;

describe("generated-only evidence boundary", () => {
  it("loads and pins all ten active observed datasets", () => {
    expect(loader.metadata.datasets).toHaveLength(10);
    expect(loader.metadata.datasets.reduce((sum,d) => sum+d.recordCount,0)).toBe(1191);
    for (const key of Object.keys(activeDatasets) as DatasetKey[]) {
      expect(validateDataset(key, activeDatasets[key].artifact).manifest.releaseId).toBe(activeDatasets[key].releaseId);
    }
  });
  it.each(["kind", "release", "schema", "value", "provenance", "extra-field", "duplicate"])("rejects mutated %s before exposing evidence", (mutation) => {
    const artifact = structuredClone(activeDatasets.rent.artifact);
    switch (mutation) {
      case "kind": artifact.kind = "AUDIT"; break;
      case "release": artifact.manifest.releaseId = "unreviewed"; break;
      case "schema": artifact.manifest.schemaVersion = "99.0.0"; break;
      case "value": artifact.records[0].valueGbp += 1; break;
      case "provenance": artifact.records[0].provenance.sourceUrl = "https://example.invalid"; break;
      case "extra-field": Object.assign(artifact, { cityFallback: true }); break;
      case "duplicate": artifact.records[1] = structuredClone(artifact.records[0]); break;
    }
    expect(() => validateDataset("rent", artifact)).toThrow(EvidenceLoadError);
  });
  it("rejects missing injected datasets rather than filling them with defaults", () => {
    expect(() => createEvidenceLoader({} as Record<DatasetKey, unknown>)).toThrow(EvidenceLoadError);
  });
  it("does not freeze or mutate a supplied artifact while validating it", () => {
    const supplied = structuredClone(activeDatasets.energyConsumption.artifact);
    const before = structuredClone(supplied);
    validateDataset("energyConsumption", supplied);
    expect(supplied).toEqual(before);
    expect(Object.isFrozen(supplied.records[0].qa)).toBe(false);
  });
  it("returns deeply immutable evidence", () => {
    const record = loader.getRentEvidence({ cityId: "LOC-GLA", bedroomBand: "two bed", sourcePeriod: "2026-07" })[0];
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.provenance)).toBe(true);
    expect(() => Object.assign(record.geography.official, { name: "Glasgow City" })).toThrow();
  });
  it("restricts the transitive runtime dependency graph to schemas and generated JSON", () => {
    const seen = new Set<string>();
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      expect(file).not.toMatch(/data\/(controlled|raw|ingestion)/);
      if (file.endsWith(".json")) { expect(file).toContain("/data/generated/"); return; }
      const source = readFileSync(file,"utf8");
      expect(source).not.toMatch(/from ["'](?:react|next|node:fs)/);
      const imports = [...source.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map((m) => m[1]);
      for (const specifier of imports.filter((s) => s.startsWith("."))) {
        const target = resolve(dirname(file),specifier);
        if (target.endsWith(".json")) visit(target);
        else {
          try { readFileSync(`${target}.ts`); visit(`${target}.ts`); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; visit(`${target}/index.ts`); }
        }
      }
    };
    visit(resolve("src/engine/index.ts"));
    expect([...seen].filter((p) => p.endsWith(".json"))).toHaveLength(10);
    const uiFiles = ["src/app", "src/components", "src/features"].flatMap((dir) => readdirSync(dir,{recursive:true,encoding:"utf8"}).filter((p) => /\.tsx?$/.test(p)).map((p) => `${dir}/${p}`));
    for (const file of uiFiles) expect(readFileSync(file,"utf8")).not.toMatch(/data\/generated|data\/controlled|data\/ingestion/);
  });
  it("returns candidate evidence without making provider/region/product defaults", () => {
    expect(loader.getWaterEvidence("unknown-provider")).toEqual([]);
    expect(loader.getEnergyPriceEvidence({region:"Birmingham",effectiveOn:"2026-09-14"})).toEqual([]);
    expect(loader.getTransportProducts({cityId:"LOC-LON",effectiveOn:"2026-09-15"})).toEqual([]);
    expect(loader.getGroceryReference()[0].geography.official.name).toBe("United Kingdom");
  });
});

describe("exact rational pence", () => {
  it("adds decimal amounts without floating point accumulation", () => {
    expect(addMoney(fromGbp("0.1"),fromGbp("0.2"))).toEqual(fromGbp("0.3"));
    let total = fromGbp("0");
    for (let i=0;i<1000;i++) total = addMoney(total,fromGbp("0.01"));
    expect(total).toEqual(fromGbp("10"));
  });
  it("preserves subpenny source precision and arbitrarily large whole-pound values", () => {
    expect(fromGbp("0.12345")).toEqual({currency:"GBP",unit:"pence",numerator:"2469",denominator:"200"});
    expect(formatGbp(fromGbp("9007199254740993.01"))).toBe("9007199254740993.01");
    expect(JSON.parse(JSON.stringify(fromGbp("1.234")))).toEqual(fromGbp("1.234"));
  });
  it("normalizes weekly and annual equivalents without intermediate rounding", () => {
    expect(monthlyEquivalent(fromGbp("1"),"WEEKLY")).toMatchObject({numerator:"1300",denominator:"3"});
    const annual = monthlyEquivalent(fromGbp("1"),"ANNUAL");
    expect(annual).toMatchObject({numerator:"25",denominator:"3"});
    expect(multiplyMoney(annual,BigInt(12))).toEqual(fromGbp("1"));
    expect(monthlyEquivalent(fromGbp("120"),"ANNUAL")).toEqual(fromGbp("10"));
  });
  it("uses explicit inclusive calendar dates for daily charges", () => {
    expect(dailyChargeForPeriod(fromGbp("0.5"),"2024-02-01","2024-02-29")).toEqual(fromGbp("14.5"));
    expect(dailyChargeForPeriod(fromGbp("0.5"),"2026-02-01","2026-02-28")).toEqual(fromGbp("14"));
    expect(() => dailyChargeForPeriod(fromGbp("1"),"2026-02-30","2026-03-02")).toThrow();
    expect(() => dailyChargeForPeriod(fromGbp("1"),"2026-03-02","2026-03-01")).toThrow();
    expect(() => monthlyEquivalent(fromGbp("1"),"DAILY" as "ANNUAL")).toThrow();
  });
  it.each([["1.005","1.01"],["-1.005","-1.01"],["1.004","1.00"],["-0.004","0.00"]])("rounds %s only at display to %s", (value,expected) => {
    expect(formatGbp(fromGbp(value))).toBe(expected);
  });
});

describe("validated core inputs", () => {
  it("normalizes salary exactly without changing raw input or inferring jurisdiction", () => {
    const raw=input(), before=structuredClone(raw), result=normalizeCalculatorInput(raw,loader);
    expect(raw).toEqual(before);
    expect(result.status).toBe("VALID");
    if(result.status!=="VALID") throw new Error("invalid fixture");
    expect(result.input.currentLocation.grossAnnualSalary).toEqual(fromGbp("40000"));
    expect(result.input.currentLocation.income.taxJurisdiction).toBeUndefined();
  });
  it.each(["negative-salary","negative-adults","negative-children","negative-override","zero-override","city","bedrooms","product","age-count","unknown-category"])("rejects %s", (mutation) => {
    const raw=input();
    switch(mutation) {
      case "negative-salary": raw.currentLocation.income.grossAnnualSalaryGbp="-1";break;
      case "negative-adults": raw.household.adults=-1;break;
      case "negative-children": raw.household.children=-1;break;
      case "negative-override": raw.currentLocation.housing.overrides.rent={...override,amountGbp:"-1"};break;
      case "zero-override": raw.currentLocation.housing.overrides.rent={...override,amountGbp:"0.00"};break;
      case "city": Object.assign(raw.currentLocation,{cityId:"LOC-UNKNOWN"});break;
      case "bedrooms": Object.assign(raw.currentLocation.housing,{bedrooms:0});break;
      case "product": raw.currentLocation.transport={status:"SELECTED",productId:"cheapest"};break;
      case "age-count": raw.household.childAges=[4];break;
      case "unknown-category": Object.assign(raw.currentLocation.housing.overrides,{randomCost:override});break;
    }
    const result=normalizeCalculatorInput(raw,loader);
    expect(result.status).toBe("INVALID");
    expect(result.diagnostics[0].severity).toBe("blocking");
  });
  it("rejects a real product selected for the wrong city or unverified date", () => {
    const raw=input();
    const id=loader.getTransportProducts({cityId:"LOC-GLA",effectiveOn:"2026-09-14"})[0].recordId;
    raw.currentLocation.transport={status:"SELECTED",productId:id};
    expect(normalizeCalculatorInput(raw,loader).status).toBe("INVALID");
    raw.currentLocation.cityId="LOC-GLA";
    expect(normalizeCalculatorInput(raw,loader).status).toBe("VALID");
    raw.currentLocation.effectiveOn="2026-09-15";
    expect(normalizeCalculatorInput(raw,loader).status).toBe("INVALID");
  });
  it("supports explicit net-income and spending inputs without inventing model outputs", () => {
    const raw=input(); raw.currentLocation.income.grossAnnualSalaryGbp="0";
    raw.currentLocation.income.netMonthlyIncomeOverride=override;
    raw.currentLocation.spending={groceries:override,essentials:override,lifestyle:override};
    expect(normalizeCalculatorInput(raw,loader).status).toBe("VALID");
  });
});

describe("no-fallback evidence resolution and lineage", () => {
  it.each([["LOC-LON","London","E12000007"],["LOC-GLA","Greater Glasgow","S33000009"]] as const)("preserves %s source geography", (cityId,name,code) => {
    const result=resolveRent(loader,{...rentRequest,cityId});
    expect(result.status).toBe("RESOLVED");
    expect(result.baselineEvidence.records[0].geography.official).toMatchObject({name,code});
    expect(result.cityId).toBe(cityId);
  });
  it.each(["LOC-LON","LOC-BIR","LOC-MAN","LOC-LEE","LOC-LIV","LOC-BRS","LOC-GLA"] as const)("resolves exact bedroom evidence for %s", (cityId) => {
    for (const bedrooms of [1,2,3,4] as const) expect(resolveRent(loader,{...rentRequest,cityId,bedrooms}).status).toBe("RESOLVED");
  });
  it("keeps Edinburgh missing with no amount or alternative geography", () => {
    const result=calculateRent(loader,{...rentRequest,cityId:"LOC-EDI"});
    expect(result.status).toBe("UNRESOLVED");
    expect(result.diagnostics[0].code).toBe("EDINBURGH_RENT_SOURCE_UNRESOLVED");
    expect(result).not.toHaveProperty("monthlyAmount");
    expect(result.evidenceLineage).toEqual([]);
  });
  it("does not select a different month or manufacture property cross-tabs", () => {
    expect(resolveRent(loader,{...rentRequest,sourcePeriod:"2026-08"}).status).toBe("UNRESOLVED");
    expect(resolveRent(loader,{...rentRequest,propertyType:"detached"}).status).toBe("UNRESOLVED");
  });
  it("keeps London council tax unresolved and never chooses or averages authorities", () => {
    const result=calculateCouncilTax(loader,{cityId:"LOC-LON",effectiveOn:"2026-09-14"});
    expect(result.status).toBe("UNRESOLVED");
    expect(result.diagnostics[0].code).toBe("LONDON_CITY_DEFAULT_UNRESOLVED");
    expect(result).not.toHaveProperty("monthlyAmount");
    expect(resolveCouncilTax(loader,{cityId:"LOC-LON",effectiveOn:"2026-09-14",selection:{authorityName:"Birmingham",band:"D"}}).status).toBe("UNRESOLVED");
  });
  it.each(["LOC-LON","LOC-EDI"] as const)("allows a user override to resolve a known gap in %s", (cityId) => {
    const result=cityId==="LOC-LON" ? calculateCouncilTax(loader,{cityId,effectiveOn:"2026-09-14",override}) : calculateRent(loader,{...rentRequest,cityId,override});
    expect(result).toMatchObject({status:"RESOLVED",classification:"USER_ENTERED",overrideStatus:"USER_OVERRIDE",monthlyAmount:fromGbp("987.65"),baselineEvidence:{status:"UNAVAILABLE"}});
    expect(result.diagnostics.some((d)=>d.code==="USER_OVERRIDE_APPLIED")).toBe(true);
  });
  it("preserves baseline provenance through overrides without mutation", () => {
    const before=resolveRent(loader,rentRequest), saved=JSON.stringify(before.baselineEvidence);
    const result=calculateRent(loader,{...rentRequest,override});
    expect(result).toMatchObject({status:"RESOLVED",classification:"USER_ENTERED"});
    expect(result.evidenceLineage).toEqual(before.baselineEvidence.records);
    expect(JSON.stringify(resolveRent(loader,rentRequest).baselineEvidence)).toBe(saved);
  });
  it("keeps rent observed and annual council tax conversion calculated with source lineage", () => {
    expect(calculateRent(loader,rentRequest)).toMatchObject({status:"RESOLVED",classification:"OBSERVED_DATA",amountBasis:"SOURCE_MONTH"});
    const request={cityId:"LOC-BIR",effectiveOn:"2026-09-14",selection:{authorityName:"Birmingham",authorityCode:"E08000025",band:"D"}} as const;
    const result=calculateCouncilTax(loader,request);
    expect(result).toMatchObject({status:"RESOLVED",classification:"CALCULATED",lineageClassifications:["OBSERVED_DATA","CALCULATED"],formula:{expression:"annualGbp / 12"}});
    expect(result.evidenceLineage[0].valueType).toBe("OBSERVED_DATA");
    const overridden=calculateCouncilTax(loader,{...request,override});
    expect(overridden.evidenceLineage).toEqual(result.evidenceLineage);
    expect(overridden).toMatchObject({classification:"USER_ENTERED",monthlyAmount:fromGbp("987.65")});
    expect(resolveCouncilTax(loader,{...request,effectiveOn:"2027-04-01"}).status).toBe("UNRESOLVED");
    expect(resolveCouncilTax(loader,{...request,selection:{...request.selection,authorityCode:"E08000003"}}).status).toBe("UNRESOLVED");
  });
  it("does not infer Scottish tax residency or substitute NI categories", () => {
    const tax=resolveTaxReference(loader,{cityId:"LOC-GLA",taxYear:"2026/27"});
    expect(tax.status).toBe("UNRESOLVED");
    expect(tax.diagnostics[0].code).toBe("TAX_JURISDICTION_REQUIRED");
    for (const [jurisdiction,count] of [["Scotland",9],["rUK",6]] as const) {
      const resolved=resolveTaxReference(loader,{cityId:"LOC-GLA",taxYear:"2026/27",jurisdiction});
      expect(resolved.status).toBe("RESOLVED");expect(resolved.baselineEvidence.records).toHaveLength(count);
    }
    expect(resolveTaxReference(loader,{cityId:"LOC-LON",jurisdiction:"rUK",taxYear:"2027/28"}).status).toBe("UNRESOLVED");
    for (const payPeriod of ["weekly","monthly","annual"] as const) expect(resolveNiReference(loader,{cityId:"LOC-LON",taxYear:"2026/27",categoryLetter:"A",payPeriod}).baselineEvidence.records).toHaveLength(3);
    expect(resolveNiReference(loader,{cityId:"LOC-LON",taxYear:"2026/27",categoryLetter:"B",payPeriod:"monthly"}).status).toBe("UNRESOLVED");
  });
  it("rejects invalid direct resolver overrides even when baseline evidence exists", () => {
    expect(()=>calculateRent(loader,{...rentRequest,override:{...override,amountGbp:"-1"}})).toThrow();
  });
});

describe("explicit calculator extension points", () => {
  it.each(["income_tax","national_insurance","energy","water","groceries","household_spending","transport"] as const)("returns %s unresolved without a fake zero", (category) => {
    const parsed=normalizeCalculatorInput(input(),loader);if(parsed.status!=="VALID") throw new Error("bad fixture");
    const context: CategoryCalculatorContext={household:parsed.input.household,location:parsed.input.currentLocation,evidence:loader};
    const result=categoryCalculators[category](context);
    expect(result.status).toBe("UNRESOLVED");expect(result).not.toHaveProperty("monthlyAmount");
    expect(result.diagnostics[0].severity).toBe("blocking");
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
  it("has an interface for every category and rejects unknown categories", () => {
    expect(Object.keys(categoryCalculators).sort()).toEqual([...categorySchema.options].sort());
    expect(categorySchema.safeParse("random" as Category).success).toBe(false);
  });
});
