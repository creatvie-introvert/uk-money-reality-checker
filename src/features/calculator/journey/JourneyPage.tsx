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
function errorMessage(error: FieldError) {
  return error.step === "start" && error.message === "Choose or enter city." ? "Choose a city." : error.message;
}

function FormField({ field, step, errors, hint }: { field: Field; step: JourneyStep; errors: FieldError[]; hint?: string }) {
  const { state, dispatch } = useJourney();
  const value = fieldValue(state.form, field.path), error = errors.find((e) => e.path === field.path);
  const update = (value: string) => dispatch({ type: "CHANGE", path: field.path, value, step });
  const shared = { id: field.path, name: field.path, "aria-invalid": Boolean(error), "aria-required": Boolean(field.required), "aria-describedby": `${field.path}-help${error ? ` ${field.path}-error` : ""}` };
  const select = field.kind === "select" && <select {...shared} value={value} onChange={(e) => update(e.target.value)}><option value="">Choose an option</option>{field.options?.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>;
  return <div className={styles.field}>
    {field.kind === "scope" ? <label className={styles.confirm}><input {...shared} type="checkbox" checked={Boolean(value)} onChange={(e) => update(e.target.checked ? "ONE_EMPLOYEE_ONE_EMPLOYMENT" : "")} />{field.label}</label> : <><label htmlFor={field.path}>{field.label}{field.required && <span> · required</span>}</label>
      {field.kind === "select" ? step === "start" ? <div className={styles.moveSelect}>{select}</div> : select
        : <div className={field.kind === "money" ? styles.money : undefined}>{field.kind === "money" && <span aria-hidden="true">£</span>}<input {...shared} type={field.kind === "date" ? "date" : "text"} inputMode={field.kind === "money" ? "decimal" : field.kind === "count" ? "numeric" : undefined} autoComplete="off" value={value} onChange={(e) => update(e.target.value)} />{field.kind === "money" && <span aria-hidden="true">{field.path.endsWith("grossAnnualSalaryGbp") ? "/ year" : "/ month"}</span>}</div>}</>}
    <small id={`${field.path}-help`}>{hint ?? field.hint ?? (field.kind === "money" ? "Enter pounds without a £ sign or commas." : "")}</small>
    {field.details && <details className={styles.employmentDetails}><summary>Employment calculation details</summary><p>{field.details}</p></details>}
    {error && <p className={styles.error} id={`${field.path}-error`}>{errorMessage(error)}</p>}
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
  const isMoveSetup = step === "start";
  const currentCity = cityLabels[state.form.current.cityId];
  const destinationCity = cityLabels[state.form.destination.cityId];
  const stepHeading = <h1 ref={heading} tabIndex={-1} style={{ outline: "0 none transparent", boxShadow: "none" }}>{stepTitles[step]}</h1>;
  return <div className={`${report.page} ${styles.page}${isMoveSetup ? ` ${styles.moveSetup}` : ""}`}><a className={report.skip} href="#calculator-main">Skip to calculator</a><ResultsHeader onRestart={restart} />
    <main id="calculator-main" tabIndex={-1} className={styles.container}>
      {isMoveSetup && <>
        <nav className={styles.moveBreadcrumb} aria-label="Breadcrumb"><Link href="/">UK Money Reality</Link><span aria-hidden="true">/</span><span>Calculator</span><span aria-hidden="true">/</span><span aria-current="page">Move setup</span></nav>
        <div className={styles.moveIntro}>
          <div><div className={styles.moveEyebrow}>Your comparison starts here</div>{stepHeading}<p>Choose your current city and the city you’re considering. You can also compare changes within the same city.</p></div>
          <div className={styles.movePrivacy}><MoveIcon kind="lock" /><span>Your answers stay in this calculator session. Refreshing or leaving the calculator clears them.</span></div>
        </div>
      </>}
      <nav aria-label="Calculator progress" className={isMoveSetup ? styles.moveProgress : undefined}>
        {isMoveSetup && <><div className={styles.moveProgressTop}><strong>Step 1 of 7 · Move setup</strong><span>About your move</span></div><div className={styles.moveTrack} aria-hidden="true"><span /></div></>}
        <ol className={styles.progress}>{steps.map((s, i) => <li key={s} data-completed={state.completed.includes(s)} aria-current={s === step ? "step" : undefined}><span className={styles.dot} aria-hidden="true">{state.completed.includes(s) && s !== step ? "✓" : i + 1}</span><span>{stepLabels[s]}{state.completed.includes(s) && <small>Visited & validated</small>}</span></li>)}</ol></nav>
      <div className={isMoveSetup ? styles.moveWorkspace : undefined}>
      <section className={styles.panel} aria-labelledby={isMoveSetup ? "move-locations-title" : undefined}>
        {isMoveSetup ? <div className={styles.moveFormTop}><h2 id="move-locations-title">Your two locations</h2><p>Start with where you live now, then choose where you’re thinking of moving.</p></div> : <><p className={styles.eyebrow}>Step {position + 1} of 7 · Your move comparison</p>{stepHeading}</>}
        {!isMoveSetup && <p className={styles.intro}>{step === "review" ? "Review your entered inputs. Unknown costs stay unresolved; they are never replaced with estimates." : "Your current and destination details stay separate. Nothing is saved after you leave this calculator session."}</p>}
        {errors.length > 0 && <div className={styles.errorSummary} role="alert" aria-label="Input errors" tabIndex={-1} ref={errorSummary}><h2>Check these inputs</h2><ul>{errors.map((e, i) => <li key={`${e.path}:${i}`}>{step === "review" ? <button type="button" onClick={() => { dispatch({ type: "EDIT" }); navigate(e.step); }}>{errorMessage(e)} — {stepLabels[e.step]}</button> : <a href={`#${e.path}`} onClick={() => document.getElementById(e.path)?.focus()}>{isMoveSetup ? `${e.path.startsWith("current.") ? "Current city" : "Destination city"}: ${errorMessage(e)}` : errorMessage(e)}</a>}</li>)}</ul></div>}
        {failed && <p role="alert">The comparison could not be calculated. Your inputs are still here; please try again.</p>}
        <form noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={!hydrated || busy} className={styles.fields}>
            {step === "review" ? <><div className={styles.notice}>Unentered costs and unsupported evidence may make your result partial. These are your inputs, not calculated financial results. Childcare is outside the current scope.</div>
              {reviewSections(state.form).map((section) => <section className={styles.review} key={section.label}><div className={styles.reviewHeading}><h2>{section.label}</h2><button type="button" onClick={() => { dispatch({ type: "EDIT" }); navigate(section.step); }}>{section.editLabel}</button></div><div className={styles.columns}>{section.groups.map((group) => <div key={group.label}><h3>{group.label}</h3><dl>{group.rows.filter((row) => !row.secondary).map((row) => <div key={row.label}><dt>{row.label}</dt><dd data-unresolved={row.value === "Not supplied / unresolved"}>{row.value}</dd></div>)}</dl>{group.rows.some((row) => row.secondary) && <div className={styles.reviewContext}><p>Evidence & calculation details</p><dl>{group.rows.filter((row) => row.secondary).map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></div>}</div>)}</div></section>)}</>
              : <>{shared.length > 0 && <fieldset className={styles.shared}><legend>Everyone moving together</legend><p>Household composition is shared. Costs and salary are not multiplied by these counts.</p>{shared.map((field) => <FormField key={field.path} field={field} errors={errors} step={step} />)}</fieldset>}
                <div className={styles.columns}>{roles.map((role, index) => <Fragment key={role}>
                  {isMoveSetup && index > 0 && <span className={styles.moveArrow} aria-hidden="true">→</span>}
                  <fieldset className={styles.scenario} data-scenario={role}><legend>{isMoveSetup && <span className={styles.movePlaceIcon}><MoveIcon kind={role === "current" ? "home" : "pin"} /></span>}<span>{isMoveSetup && <span className={styles.moveRole} aria-hidden="true">{role === "current" ? "Current" : "Destination"}</span>}{roleLabels[role]}</span></legend>{stepFields(state.form, step, role).map((field) => <FormField key={field.path} field={field} step={step} errors={errors} hint={isMoveSetup ? role === "current" ? "Choose from the eight supported UK cities." : "The same city is allowed if you’re comparing a change in circumstances." : undefined} />)}</fieldset>
                </Fragment>)}</div>
                {isMoveSetup && <div aria-live="polite" aria-atomic="true">{currentCity && destinationCity && <div className={styles.moveRoute} data-testid="move-route-preview"><strong>{currentCity} <span aria-hidden="true">→</span><span className={report.srOnly}> to </span> {destinationCity}</strong><span>You can change either city before continuing.</span></div>}</div>}
                {["spending", "lifestyle"].includes(step) && <p className={styles.notice}>{journeyCopy.spendingNote}</p>}</>}
            <div role="status" className={report.srOnly}>{busy ? "Calculating your comparison" : ""}</div><div className={styles.actions}>{position > 0 ? <button type="button" className={styles.secondary} onClick={() => navigate(steps[position - 1])}>Back</button> : isMoveSetup ? <p className={styles.moveActionNote}>Choose both locations to continue. No financial figures are estimated at this step.</p> : <span />}
              <button className={styles.primary} type="submit">{busy ? "Calculating…" : step === "review" ? "See my move reality" : state.editing ? "Save and return to review" : isMoveSetup ? "Continue to household & homes" : "Continue"} <span aria-hidden="true">→</span></button></div>
          </fieldset>
        </form>
        <p className={styles.privacy}>Progress tracks the steps you have visited and validated, not financial completeness. Refreshing clears your inputs.</p>
      </section>
      {isMoveSetup && <aside className={styles.moveSide} aria-label="About your comparison">
        <section className={styles.moveSideCard}><span className={styles.moveSideIcon}><MoveIcon kind="card" /></span><h2>What happens next?</h2><p>We’ll ask about your household, home, income and the costs you want to include. You can go back and edit your answers as you go.</p><ul><li><MoveIcon kind="check" /><span>Published figures are used only where the evidence fits your choices.</span></li><li><MoveIcon kind="check" /><span>Unknown costs can stay unknown; your result may be partial.</span></li></ul></section>
        <section className={styles.moveSideCard}><span className={styles.moveSideIcon}><MoveIcon kind="info" /></span><h2>Why these eight cities?</h2><p>This is the current UK launch coverage. Evidence differs by location and cost category; selecting a city does not fill in your household spending automatically.</p></section>
      </aside>}
      </div>
    </main>
    <PublicFooter />
  </div>;
}
