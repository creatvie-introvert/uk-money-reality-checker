"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cityLabels } from "@/product/calculator/copy";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ResultsHeader } from "@/components/report/ResultsPage";
import report from "@/components/report/results.module.css";
import { journeyCopy, fieldValue, reviewSections, roles, roleLabels, steps, stepLabels, stepTitles, stepFields, stepPath, validateStep, validateJourney, type Field, type FieldError, type JourneyStep } from "@/product/calculator/journey";
import { useJourney } from "./JourneyProvider";
import styles from "./journey.module.css";

// Presentation copy only: keep the shared validation rules and error paths intact.
const householdFieldLabels: Record<string, string> = { bedrooms: "Bedrooms", effectiveOn: "Evidence date", rentSourceMonth: "Published rent period", "rent.mode": "Rent basis", "rent.amountGbp": "Monthly rent", "council.mode": "Council tax basis", "council.authorityName": "Council authority", "council.band": "Council tax band", "council.amountGbp": "Monthly council tax" };
function householdError(error: FieldError) {
  if (error.path === "household.adults") return "Enter a whole number of adults (at least one).";
  if (error.path === "household.children") return "Enter a whole number of children (zero or more).";
  const key = error.path.split(".").slice(1).join(".");
  if (key === "bedrooms") return "Choose a bedroom band.";
  if (key === "effectiveOn") return "Enter a valid evidence applicability date.";
  if (key === "rentSourceMonth") return "Choose the published rent period.";
  if (key === "rent.mode") return "Choose published rent or enter your monthly rent.";
  if (key.endsWith("amountGbp")) return "Enter a positive monthly amount in pounds, with at most two decimal places.";
  return error.message;
}
function householdSummary(error: FieldError) {
  const [role, ...parts] = error.path.split(".");
  const label = householdFieldLabels[parts.join(".")];
  return label && (role === "current" || role === "destination") ? `${role === "current" ? "Current" : "Destination"} home — ${label}: ${householdError(error)}` : householdError(error);
}
function errorMessage(error: FieldError) {
  return error.step === "start" && error.message === "Choose or enter city." ? "Choose a city." : error.message;
}

function FormField({ field, step, errors, hint }: { field: Field; step: JourneyStep; errors: FieldError[]; hint?: string }) {
  const { state, dispatch } = useJourney();
  const value = fieldValue(state.form, field.path), error = errors.find((e) => e.path === field.path);
  const update = (value: string) => dispatch({ type: "CHANGE", path: field.path, value, step });
  const isCounter = step === "household" && field.kind === "count";
  const countName = field.path.endsWith("adults") ? "adults" : "children";
  const minimum = countName === "adults" ? 1 : 0;
  const count = Number(value);
  // Malformed typed values stay untouched; buttons resume after the user corrects them.
  const validCount = /^\d+$/.test(value) && Number.isSafeInteger(count) && count >= minimum;
  const shared = { id: field.path, name: field.path, "aria-invalid": Boolean(error), "aria-required": Boolean(field.required), "aria-describedby": `${field.path}-help${error ? ` ${field.path}-error` : ""}` };
  const select = field.kind === "select" && <select {...shared} value={value} onChange={(e) => update(e.target.value)}><option value="">Choose an option</option>{field.options?.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>;
  return <div className={styles.field}>
    {field.kind === "scope" ? <label className={styles.confirm}><input {...shared} type="checkbox" checked={Boolean(value)} onChange={(e) => update(e.target.checked ? "ONE_EMPLOYEE_ONE_EMPLOYMENT" : "")} />{field.label}</label> : <><label htmlFor={field.path}>{field.label}{field.required && <span> · required</span>}</label>
      {isCounter ? <div className={styles.householdCounter}>
        <button type="button" aria-label={`Decrease ${countName}`} disabled={!validCount || count <= minimum} onClick={() => update(String(count - 1))}>−</button>
        <div className={styles.householdControl}><input {...shared} type="text" inputMode="numeric" autoComplete="off" value={value} onChange={(e) => update(e.target.value)} /></div>
        <button type="button" aria-label={`Increase ${countName}`} disabled={value !== "" && (!validCount || count >= Number.MAX_SAFE_INTEGER)} onClick={() => update(value === "" ? "1" : String(count + 1))}>+</button>
      </div> : field.kind === "select" ? (step === "start" || step === "household") ? <div className={styles.moveSelect}>{select}</div> : select
        : <div className={field.kind === "money" ? styles.money : step === "household" ? styles.householdControl : undefined}>{field.kind === "money" && <span aria-hidden="true">£</span>}<input {...shared} type={field.kind === "date" ? "date" : "text"} inputMode={field.kind === "money" ? "decimal" : field.kind === "count" ? "numeric" : undefined} autoComplete="off" value={value} onChange={(e) => update(e.target.value)} />{field.kind === "money" && <span aria-hidden="true">{field.path.endsWith("grossAnnualSalaryGbp") ? "/ year" : "/ month"}</span>}</div>}</>}
    <small id={`${field.path}-help`}>{hint ?? field.hint ?? (field.kind === "money" ? "Enter pounds without a £ sign or commas." : "")}</small>
    {field.details && <details className={styles.employmentDetails}><summary>Employment calculation details</summary><p>{field.details}</p></details>}
    {error && <p className={styles.error} id={`${field.path}-error`}>{step === "household" ? householdError(error) : errorMessage(error)}</p>}
  </div>;
}
function MoveIcon({ kind }: { kind: "home" | "pin" | "lock" | "card" | "info" | "check" }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10H3z" /><path d="M9 20v-7h6v7" /></>,
    pin: <><path d="M12 21s7-5.2 7-12a7 7 0 0 0-14 0c0 6.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    card: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h4M15 13h2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    check: <path d="m4 12 5 5L20 6" />,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[kind]}</svg>;
}

function HouseholdFields({ errors }: { errors: FieldError[] }) {
  const { state } = useJourney();
  return <>
    <fieldset className={styles.householdBlock}><legend><span className={styles.movePlaceIcon}><MoveIcon kind="home" /></span><span><span className={styles.sectionKicker}>Shared household</span>Who’s moving together?</span></legend>
      <p>Household counts describe your comparison. They do not automatically multiply costs, infer bedroom needs, calculate childcare or apply council-tax discounts.</p>
      <div className={styles.householdCounts}>{stepFields(state.form, "household").map((field) => <FormField key={field.path} field={field} step="household" errors={errors} hint={field.path.endsWith("adults") ? "People aged 18 and over. Enter at least one adult." : "Enter zero if there are no children under 18. Childcare is outside this calculation."} />)}</div>
    </fieldset>
    <div className={styles.homeHeading}><span className={styles.sectionKicker}>Two homes, two sets of costs</span><h2>Tell us about each home</h2><p>Choose published figures where they apply, or enter your own amounts. Missing evidence may lead to a partial result.</p></div>
    <div className={styles.homeGrid}>{roles.map((role) => {
      const fields = stepFields(state.form, "household", role), city = cityLabels[state.form[role].cityId];
      const renderField = (field: Field) => <FormField key={field.path} field={field} step="household" errors={errors} hint={field.path.endsWith("effectiveOn") ? "The applicability date for supported charges and tax evidence. It is not your moving date. Rent uses its separate published source month." : undefined} />;
      return <fieldset className={styles.homeCard} data-scenario={role} key={role}><legend><span className={styles.homeMark}><MoveIcon kind={role === "current" ? "home" : "pin"} /></span><span><span className={styles.sectionKicker} aria-hidden="true">{role === "current" ? "Current home" : "Destination home"}</span>{roleLabels[role]}</span></legend>
        <div className={styles.homeBody}>
          {city && <div className={styles.homeLocation}><strong>{city}</strong><span>Your selected {role === "current" ? "current" : "destination"} city.</span></div>}
          {fields.filter((f) => f.path.endsWith("bedrooms") || f.path.endsWith("effectiveOn")).map(renderField)}
          <section className={styles.homeChoice} aria-labelledby={`${role}-rent-title`}><h3 id={`${role}-rent-title`}>Rent</h3>{fields.filter((f) => f.path.endsWith("rentSourceMonth") || f.path.startsWith(`${role}.rent.`)).map(renderField)}</section>
          <section className={styles.homeChoice} aria-labelledby={`${role}-council-title`}><h3 id={`${role}-council-title`}>Council tax</h3>{fields.filter((f) => f.path === `${role}.council.mode`).map(renderField)}
            {state.form[role].council.mode === "SOURCE" && <div className={styles.homeInset}>{fields.filter((f) => f.path === `${role}.council.authorityName` || f.path === `${role}.council.band`).map(renderField)}</div>}
            {fields.filter((f) => f.path === `${role}.council.amountGbp`).map(renderField)}
          </section>
        </div>
      </fieldset>;
    })}</div>
    <div className={styles.homeEvidence}><MoveIcon kind="info" /><p>Rent uses the selected source month, bedroom band and geography. Council tax requires exact supported city, authority, band and applicability-date evidence. Published annual council-tax charges are divided by 12; single-person discounts, exemptions and instalment plans are not calculated.</p></div>
  </>;
}

export function JourneyPage({ step }: { step: JourneyStep }) {
  const { state, dispatch, hydrated, calculate } = useJourney();
  const router = useRouter(), heading = useRef<HTMLHeadingElement>(null), errorSummary = useRef<HTMLDivElement>(null);
  const attempt = useRef(0);
  const [errors, setErrors] = useState<FieldError[]>([]), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => { heading.current?.focus(); return () => { attempt.current += 1; }; }, [step]);
  useEffect(() => {
    if (!errors.length) return;
    const firstInvalid = step === "review" ? null : document.getElementById(errors[0].path);
    (firstInvalid ?? errorSummary.current)?.focus();
  }, [errors, step]);
  const position = steps.indexOf(step);
  function navigate(next: JourneyStep) { setErrors([]); setFailed(false); router.push(stepPath(next)); }
  function restart() { attempt.current += 1; dispatch({ type: "RESTART" }); navigate("start"); }
  async function submit() {
    const found = step === "review" ? validateJourney(state.form) : validateStep(state.form, step);
    setErrors(found);
    if (found.length) return;
    dispatch({ type: "COMPLETE", step });
    if (step !== "review") {
      if (state.editing) { dispatch({ type: "END_EDIT" }); navigate("review"); }
      else navigate(steps[position + 1]);
      return;
    }
    setBusy(true); setFailed(false);
    const submittedAttempt = ++attempt.current;
    try {
      const result = await calculate();
      if (submittedAttempt !== attempt.current) return;
      if (result.state === "EVALUATED") { dispatch({ type: "RESULT", result: { product: result.product, view: result.view } }); router.push("/calculator/results"); }
      else setErrors([{ path: "", step: "household", message: "Review the required inputs before calculating." }]);
    } catch { if (submittedAttempt === attempt.current) setFailed(true); } finally { setBusy(false); }
  }
  const shared = stepFields(state.form, step);
  const isMoveSetup = step === "start", isHousehold = step === "household";
  const isDesigned = isMoveSetup || isHousehold;
  const currentCity = cityLabels[state.form.current.cityId];
  const destinationCity = cityLabels[state.form.destination.cityId];
  const stepHeading = <h1 ref={heading} tabIndex={-1} style={{ outline: "0 none transparent", boxShadow: "none" }}>{stepTitles[step]}</h1>;
  return <div className={`${report.page} ${styles.page}${isDesigned ? ` ${styles.designedStep}` : ""}${isHousehold ? ` ${styles.householdStep}` : ""}`}><a className={report.skip} href="#calculator-main">Skip to calculator</a><ResultsHeader onRestart={restart} />
    <main id="calculator-main" tabIndex={-1} className={styles.container}>
      {isDesigned && <>
        <nav className={styles.moveBreadcrumb} aria-label="Breadcrumb"><Link href="/">UK Money Reality</Link><span aria-hidden="true">/</span><span>Calculator</span><span aria-hidden="true">/</span><span aria-current="page">{stepLabels[step]}</span></nav>
        <div className={styles.moveIntro}>
          <div><div className={styles.moveEyebrow}>{isHousehold ? "Your household, your comparison" : "Your comparison starts here"}</div>{stepHeading}<p>{isHousehold ? "Start with who’s moving, then choose how to include housing costs for each location." : "Choose your current city and the city you’re considering. You can also compare changes within the same city."}</p></div>
          <div className={styles.movePrivacy}><MoveIcon kind="lock" /><span>Your answers stay in this calculator session. Refreshing or leaving the calculator clears them.</span></div>
        </div>
      </>}
      <nav aria-label="Calculator progress" className={isDesigned ? styles.moveProgress : undefined}>
        {isDesigned && <><div className={styles.moveProgressTop}><strong>Step {position + 1} of 7 · {stepLabels[step]}</strong><span>{isHousehold ? "About your household" : "About your move"}</span></div><div className={styles.moveTrack} aria-hidden="true"><span style={{ width: `${(position + 1) / steps.length * 100}%` }} /></div></>}
        <ol className={styles.progress}>{steps.map((s, i) => <li key={s} data-completed={state.completed.includes(s)} aria-current={s === step ? "step" : undefined}><span className={styles.dot} aria-hidden="true">{state.completed.includes(s) && s !== step ? "✓" : i + 1}</span><span>{stepLabels[s]}{state.completed.includes(s) && <small>Visited & validated</small>}</span></li>)}</ol></nav>
      <div className={isDesigned ? styles.moveWorkspace : undefined}>
      <section className={styles.panel} aria-labelledby={isDesigned ? "move-locations-title" : undefined}>
        {isDesigned ? <div className={styles.moveFormTop}>{isHousehold && <span className={styles.sectionKicker}>Your details · Step 2</span>}<h2 id="move-locations-title">{isHousehold ? "Make the comparison yours" : "Your two locations"}</h2><p>{isHousehold ? "We’ll keep your current home and destination separate, so you can see what changes." : "Start with where you live now, then choose where you’re thinking of moving."}</p></div> : <><p className={styles.eyebrow}>Step {position + 1} of 7 · Your move comparison</p>{stepHeading}</>}
        {!isDesigned && <p className={styles.intro}>{step === "review" ? "Review your entered inputs. Unknown costs stay unresolved; they are never replaced with estimates." : "Your current and destination details stay separate. Nothing is saved after you leave this calculator session."}</p>}
        {errors.length > 0 && <div className={styles.errorSummary} role="alert" aria-label="Input errors" tabIndex={-1} ref={errorSummary}><h2>Check these inputs</h2><ul>{errors.map((e, i) => <li key={`${e.path}:${i}`}>{step === "review" ? <button type="button" onClick={() => { dispatch({ type: "EDIT" }); navigate(e.step); }}>{errorMessage(e)} — {stepLabels[e.step]}</button> : <a href={`#${e.path}`} onClick={() => document.getElementById(e.path)?.focus()}>{isMoveSetup ? `${e.path.startsWith("current.") ? "Current city" : "Destination city"}: ${errorMessage(e)}` : isHousehold ? householdSummary(e) : errorMessage(e)}</a>}</li>)}</ul></div>}
        {failed && <p role="alert">The comparison could not be calculated. Your inputs are still here; please try again.</p>}
        <form noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={!hydrated || busy} className={styles.fields}>
            {step === "review" ? <><div className={styles.notice}>Unentered costs and unsupported evidence may make your result partial. These are your inputs, not calculated financial results. Childcare is outside the current scope.</div>
              {reviewSections(state.form).map((section) => <section className={styles.review} key={section.label}><div className={styles.reviewHeading}><h2>{section.label}</h2><button type="button" onClick={() => { dispatch({ type: "EDIT" }); navigate(section.step); }}>{section.editLabel}</button></div><div className={styles.columns}>{section.groups.map((group) => <div key={group.label}><h3>{group.label}</h3><dl>{group.rows.filter((row) => !row.secondary).map((row) => <div key={row.label}><dt>{row.label}</dt><dd data-unresolved={row.value === "Not supplied / unresolved"}>{row.value}</dd></div>)}</dl>{group.rows.some((row) => row.secondary) && <div className={styles.reviewContext}><p>Evidence & calculation details</p><dl>{group.rows.filter((row) => row.secondary).map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></div>}</div>)}</div></section>)}</>
              : isHousehold ? <HouseholdFields errors={errors} /> : <>{shared.length > 0 && <fieldset className={styles.shared}><legend>Everyone moving together</legend><p>Household composition is shared. Costs and salary are not multiplied by these counts.</p>{shared.map((field) => <FormField key={field.path} field={field} errors={errors} step={step} />)}</fieldset>}
                <div className={styles.columns}>{roles.map((role, index) => <Fragment key={role}>
                  {isMoveSetup && index > 0 && <span className={styles.moveArrow} aria-hidden="true">→</span>}
                  <fieldset className={styles.scenario} data-scenario={role}><legend>{isMoveSetup && <span className={styles.movePlaceIcon}><MoveIcon kind={role === "current" ? "home" : "pin"} /></span>}<span>{isMoveSetup && <span className={styles.moveRole} aria-hidden="true">{role === "current" ? "Current" : "Destination"}</span>}{roleLabels[role]}</span></legend>{stepFields(state.form, step, role).map((field) => <FormField key={field.path} field={field} step={step} errors={errors} hint={isMoveSetup ? role === "current" ? "Choose from the eight supported UK cities." : "The same city is allowed if you’re comparing a change in circumstances." : undefined} />)}</fieldset>
                </Fragment>)}</div>
                {isMoveSetup && <div aria-live="polite" aria-atomic="true">{currentCity && destinationCity && <div className={styles.moveRoute} data-testid="move-route-preview"><strong>{currentCity} <span aria-hidden="true">→</span><span className={report.srOnly}> to </span> {destinationCity}</strong><span>You can change either city before continuing.</span></div>}</div>}
                {["spending", "lifestyle"].includes(step) && <p className={styles.notice}>{journeyCopy.spendingNote}</p>}</>}
            <div role="status" className={report.srOnly}>{busy ? "Calculating your comparison" : ""}</div><div className={styles.actions}>{position > 0 ? <button type="button" className={styles.secondary} onClick={() => navigate(steps[position - 1])}>{isHousehold ? "Back to move setup" : "Back"}</button> : isMoveSetup ? <p className={styles.moveActionNote}>Choose both locations to continue. No financial figures are estimated at this step.</p> : <span />}
              <button className={styles.primary} type="submit">{busy ? "Calculating…" : step === "review" ? "See my move reality" : state.editing ? "Save and return to review" : isMoveSetup ? "Continue to household & homes" : isHousehold ? "Continue to income" : "Continue"} <span aria-hidden="true">→</span></button></div>
          </fieldset>
        </form>
        <p className={styles.privacy}>Progress tracks the steps you have visited and validated, not financial completeness. Refreshing clears your inputs.</p>
      </section>
      {isMoveSetup && <aside className={styles.moveSide} aria-label="About your comparison">
        <section className={styles.moveSideCard}><span className={styles.moveSideIcon}><MoveIcon kind="card" /></span><h2>What happens next?</h2><p>We’ll ask about your household, home, income and the costs you want to include. You can go back and edit your answers as you go.</p><ul><li><MoveIcon kind="check" /><span>Published figures are used only where the evidence fits your choices.</span></li><li><MoveIcon kind="check" /><span>Unknown costs can stay unknown; your result may be partial.</span></li></ul></section>
        <section className={styles.moveSideCard}><span className={styles.moveSideIcon}><MoveIcon kind="info" /></span><h2>Why these eight cities?</h2><p>This is the current UK launch coverage. Evidence differs by location and cost category; selecting a city does not fill in your household spending automatically.</p></section>
      </aside>}
      {isHousehold && <aside className={styles.moveSide} aria-label="About your household and homes">
        <section className={styles.moveSideCard}><span className={styles.moveSideIcon}><MoveIcon kind="home" /></span><h2>Why we ask about your home</h2><p>Bedroom band and source month help us check whether published rent evidence fits your comparison. You can enter your actual monthly rent instead.</p><ul><li><MoveIcon kind="check" /><span>Current and destination inputs remain independent.</span></li><li><MoveIcon kind="check" /><span>No rent, council-tax band or discounts are invented.</span></li></ul></section>
        <section className={styles.moveSideCard}><span className={styles.moveSideIcon}><MoveIcon kind="info" /></span><h2>Not sure of an amount?</h2><p>Council tax can remain “I don’t know yet”. For rent, choose published evidence or enter a positive monthly amount. Missing evidence may produce a partial result.</p><p className={styles.homeUnknown}>Unknown, blank and £0 are different. Entered rent and council tax must be greater than £0.</p><div className={styles.homeCallout}><h3>Evidence varies by location</h3><p>London rent is regional evidence; published council tax is unavailable for London in this journey, so enter your bill or leave it unknown. Edinburgh has no approved exact rent row. Greater Glasgow rent covers a broader area than Glasgow City.</p></div></section>
      </aside>}
      </div>
    </main>
    <PublicFooter />
  </div>;
}
