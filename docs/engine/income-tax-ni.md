# Slice 2: annual employment income

Implemented on 15 September 2026 from `3f07081` on `rebuild/next-production`, matching live origin. The workbook was the only untracked starting file. No evidence release or UI changes are part of this slice.

## Supported scope and contracts

One nonnegative annual gross employment salary, explicit rUK or Scotland jurisdiction, standard Personal Allowance, 2026/27 pinned references and employee Class 1 NI category A. This is an annual salary comparison, not a payroll engine.

The public pure functions are `calculateIncomeTax(loader, request)`, `calculateEmployeeNi(loader, request)` and `calculateNetEmploymentIncome(loader, request)`. Requests require decimal-text `grossAnnualSalaryGbp`, `taxYear`, `scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT"` and `basis: "ANNUAL_COMPARISON"`. Tax requires `jurisdiction`; NI requires `niCategory`. The combined request requires both. Optional `effectiveOn` must fall within the evidence period. Missing/unsupported jurisdiction is unresolved; a city never supplies it.

The scenario contract now requires `income.calculationBasis: "ANNUAL_COMPARISON"`. Existing callers must add this explicit field. Its existing `payPeriod` still supports reference selection, but does not choose payroll arithmetic: the category calculator always requests the official annual NI rows. The tax/NI category registry returns annual liabilities divided by twelve and retains the full `incomeBreakdown`. Net income has a standalone function; household orchestration remains deferred.

`netMonthlyIncomeOverride` remains a reserved scenario input. It cannot change gross salary, tax or NI. Applying that override to effective household net income remains deferred; the standalone net request rejects an override field rather than silently applying it.

## Evidence and classification

All numeric rates, allowances and thresholds come through the typed generated-evidence loader: `ukmr-income-tax-2026-27-v1` and `ukmr-national-insurance-2026-27-v1`, schema 1.1.0. Calculators import no generated JSON directly and contain no duplicate numeric rates table. Required band names are schema dimensions. Release metadata, effective year, source record IDs and complete immutable record provenance (including source/snapshot IDs and source limitations) remain available. Source documents are not copied into results.

Tax, NI and net are `CALCULATED`, with `USER_ENTERED`, `OBSERVED_DATA` and `CALCULATED` ancestry. Missing, duplicate, incompatible or unsupported references yield blocking `UNRESOLVED` results without fabricated or partial amounts. Loader corruption can still throw at the configuration trust boundary.

## Personal Allowance and adjusted net income

For this explicitly limited scenario, **adjusted net income equals annual gross employment salary**. This is a scope assumption, not an observed fact or full statutory ANI implementation.

Using loaded base allowance A, taper start S and reduction rate R:

1. Unrounded reduction = min(A, max(0, gross − S) × R).
2. Unrounded allowance = A − unrounded reduction.
3. Effective allowance = remaining allowance rounded **up to a whole pound**, capped at A.
4. Taxable income = max(0, gross − effective allowance).

The loaded zero-allowance reference must reconcile with `(zeroPoint − S) × R = A`; it is not a separate hard-coded salary switch. Outputs expose all those quantities and the rounding policy.

The whole-pound rule is in ITA 2007 s35(3), described in [Finance Act 2009 explanatory notes, section 4 paragraphs 3–4](https://www.legislation.gov.uk/ukpga/2009/10/pdfs/ukpgaen_20090010_en.pdf). [HMRC's allowance calculation guide](https://developer.service.hmrc.gov.uk/guides/tax-logic-service-guide/documentation/allowances-and-reliefs.html) also specifies flooring the reduction and ceiling the remaining allowance. Its example is labelled 2024/25; this slice uses it for methodology only, with all 2026/27 values supplied by pinned evidence. Reviewed 15 September 2026.

**Monotonicity exception:** the statutory whole-pound allowance steps can reduce exact annual net income for a one-penny gross increase. At £100,001.99 → £100,002, the exact net change is −£0.3942 (rUK) or −£0.4447 (Scotland). Tests preserve this behavior rather than imposing a false global monotonicity invariant. Full £2 steps and the tested £100 salary grid increase net income.

## Progressive tax and source boundary conversion

M1 band records use `published_income_with_standard_allowance`. Their whole-pound lower labels (for example £12,571) are publication labels, not untaxed penny gaps. After validating source adjacency and inclusive/exclusive flags, the engine allocates continuous slices `(previous taxable ceiling, next taxable ceiling]`.

Subtract the **standard base allowance** from ordinary published finite upper boundaries to obtain taxable-income limits. The final finite boundary immediately below the open top band already applies to taxable income once allowance has vanished; retain it unchanged. Never subtract the allowance twice from that top threshold, or subtract the individual's tapered allowance from every band.

For the pinned release, the derived taxable limits are:

| Jurisdiction | Cumulative taxable-income ceilings | Rates in ascending order |
| --- | --- | --- |
| rUK | £37,700; £125,140; open | 20%, 40%, 45% |
| Scotland | £3,967; £16,956; £31,092; £62,430; £125,140; open | 19%, 20%, 21%, 42%, 45%, 48% |

These are documentation of loaded evidence, not an additional production configuration. Each band reports bounds, allocated taxable income, source record ID, exact rate and tax. Allocations and tax totals reconcile exactly.

The approved Scottish advanced band runs through £125,140 inclusive and top applies above £125,140. At £125,140.01 the top allocation is £0.01, with £0.0048 tax. This agrees with the [Scottish Parliament's agreed 2026/27 rate resolution](https://www.parliament.scot/chamber-and-committees/votes-and-motions/S6M-20844), which gives taxable limits directly. [HMRC rates and allowances](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past) provide supporting band context; their top-band publication wording does not supersede M1's reconciled Scottish boundary. Both reviewed 15 September 2026.

## Employee NI and net income

> Annual NI is an annualized comparison calculation using official annual thresholds and rates. It is not a substitute for payroll-period NI calculation and may differ where pay is irregular.

Use official annual category-A records directly, never weekly × 52 or monthly × 12. The pinned annual thresholds are LEL £6,708, primary threshold £12,570 and upper earnings limit £50,270; employee rates are 0%, 8% and 2%. Earnings below LEL are exposed separately so all earnings reconcile. Each band retains thresholds, source boundary flags, allocated earnings, rate, NI and record ID.

[HMRC employer thresholds 2026/27](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027) supports the annual reference values. [CWG2 2026/27](https://www.gov.uk/government/publications/cwg2-further-guide-to-paye-and-national-insurance-contributions/2026-to-2027-employer-further-guide-to-paye-and-national-insurance-contributions) explains normal earnings-period NI and payroll rounding. Reviewed 15 September 2026. This comparison retains exact annual fractions; it does not apply payroll-period or Self Assessment return rounding procedures.

Annual net = gross − income tax − employee NI. Monthly equivalent = annual net / 12. The combined result contains both full breakdowns and their diagnostics and lineage. Either unresolved component makes net unresolved with no partial net amount.

## Precision and diagnostics

All arithmetic uses the existing BigInt rational-pence layer. Loaded decimal numbers are converted to decimal text before money/rate arithmetic. Source thresholds are compared exactly. No binary floating-point tax totals, band rounding or display-string feedback are used. The Personal Allowance whole-pound ceiling is the sole added statutory rounding step. Existing final display rounding remains separate. Monetary outputs are JSON-safe exact fractions, including fractional pennies. Input decimal text allows at most two places and 128 characters; arbitrary safe-sized BigInt arithmetic avoids JavaScript integer limits.

New stable codes: `TAX_JURISDICTION_UNSUPPORTED`, `TAX_REFERENCE_MISSING`, `TAX_REFERENCE_AMBIGUOUS`, `TAX_REFERENCE_INVALID`, `NI_CATEGORY_UNSUPPORTED`, `NI_REFERENCE_MISSING`, `NI_REFERENCE_AMBIGUOUS`, `NI_REFERENCE_INVALID`, `INCOME_OUT_OF_SCOPE`, `ANI_EQUALS_GROSS_SCOPE`, `ANNUALISED_NI_COMPARISON`, `PERSONAL_ALLOWANCE_STATUTORY_ROUNDING`. Missing jurisdiction uses the existing `TAX_JURISDICTION_REQUIRED`. Invalid business input returns diagnostics with input paths; no expected missing-evidence case throws.

## QA and independent cross-checks

No normalized approved Tax_QA vectors or controlled official calculator examples were found. The raw workbook's calculations were not read. `tests/engine/fixtures/income-vectors.ts` therefore contains independently worked expectations, not official payroll outputs. Their provenance is the pinned M1 tables and the source methodology above; tests do not generate expected values using engine code.

Examples of the independent arithmetic:

- rUK £30,000: tax = (30,000 − 12,570) × 20% = £3,486; NI = 17,430 × 8% = £1,394.40; net £25,119.60.
- Scotland £30,000: tax = 3,967 × 19% + 12,989 × 20% + 474 × 21% = £3,451.07; net £25,154.53.
- rUK £110,000: allowance £7,570; taxable £102,430; tax = 37,700 × 20% + 64,730 × 40% = £33,432.
- At £125,140: NI = 37,700 × 8% + 74,870 × 2% = £4,513.40. At £150,000 it is £5,010.60.
- Scotland £125,140: tax = 3,967 × 19% + 12,989 × 20% + 14,136 × 21% + 31,338 × 42% + 62,710 × 45% = £47,701.55. The next penny adds £0.0048 tax and £0.0002 NI.

Coverage includes 16 exact QA vectors, zero/low income, every meaningful tax/NI boundary ±£0.01, taper rounding and disappearance, the three mandatory Scottish top cases, source failure/ambiguity, explicit scope, annual-table selection, changed-loader rate sensitivity, lineage, immutability, serialization and category integration. A deterministic range checks 6,002 scenarios (£0–£300,000 in £100 steps across both jurisdictions), without a new testing dependency.

## Remaining limitations

No pensions/salary sacrifice/relief, Gift Aid, student loans, benefits, self-employment, dividends, savings/rental income, benefits-in-kind, marriage/blind allowances, child benefit charge, Scottish residency determination, multiple employment, director/employer NI, other NI categories, irregular-pay or payroll-period NI, tax codes or payroll/return rounding. No UI, affordability, comparison or salary-preservation solver. Future source releases require explicit evidence review, including whether this published-boundary conversion still applies.

## Validation result

All required checks passed: `npm run lint`, `npm run typecheck`, `npm test` (621 tests across 13 files), `npm run build`, `npm run data:verify` and `git diff --check`. The targeted income suite passed all 86 tests. A separate Python Decimal calculation independently matched all 16 stored QA vectors. Two previous tax/NI stub assertions were replaced by implemented-category coverage; all other foundation proofs remain passing.

All 32 generated M1 artifacts matched their starting SHA-256 hashes; verification reconciled 1,191 observed rows and 80 coverage cells. The raw workbook remained untracked and unchanged (SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`). The build-generated `next-env.d.ts` change was restored and typecheck passed again. No dependencies, UI, generated evidence or controlled source files changed. No commit was made.
