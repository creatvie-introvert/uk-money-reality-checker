"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ResultsHeader } from "@/components/report/ResultsPage";
import report from "@/components/report/results.module.css";
import { fieldValue, reviewSections, roles, roleLabels, steps, stepLabels, stepTitles, stepFields, stepPath, validateStep, validateJourney, type Field, type FieldError, type JourneyStep } from "@/product/calculator/journey";
import { useJourney } from "./JourneyProvider";
import styles from "./journey.module.css";

function FormField({ field, step, errors }: { field: Field; step: JourneyStep; errors: FieldError[] }) {
  const { state, dispatch } = useJourney();
  const value = fieldValue(state.form, field.path), error = errors.find((e) => e.path === field.path);
  const update = (value: string) => dispatch({ type: "CHANGE", path: field.path, value, step });
  const shared = { id: field.path, name: field.path, "aria-invalid": Boolean(error), "aria-describedby": `${field.path}-help${error ? ` ${field.path}-error` : ""}` };
  return <div className={styles.field}>
    {field.kind === "scope" ? <label className={styles.confirm}><input {...shared} type="checkbox" checked={Boolean(value)} onChange={(e) => update(e.target.checked ? "ONE_EMPLOYEE_ONE_EMPLOYMENT" : "")} />{field.label}</label> : <><label htmlFor={field.path}>{field.label}{field.required && <span> · required</span>}</label>
      {field.kind === "select" ? <select {...shared} value={value} onChange={(e) => update(e.target.value)}><option value="">Choose an option</option>{field.options?.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        : <input {...shared} type={field.kind === "date" ? "date" : "text"} inputMode={field.kind === "money" ? "decimal" : field.kind === "count" ? "numeric" : undefined} autoComplete="off" value={value} onChange={(e) => update(e.target.value)} />}</>}
    <small id={`${field.path}-help`}>{field.hint ?? (field.kind === "money" ? "Enter pounds without a £ sign or commas." : "")}</small>
    {error && <p className={styles.error} id={`${field.path}-error`}>{error.message}</p>}
  </div>;
}
export function JourneyPage({ step }: { step: JourneyStep }) {
  const { state, dispatch, hydrated, calculate } = useJourney();
  const router = useRouter(), heading = useRef<HTMLHeadingElement>(null), errorSummary = useRef<HTMLDivElement>(null);
  const attempt = useRef(0);
  const [errors, setErrors] = useState<FieldError[]>([]), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => { heading.current?.focus(); return () => { attempt.current += 1; }; }, [step]);
  useEffect(() => { if (errors.length) errorSummary.current?.focus(); }, [errors]);
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
  return <div className={`${report.page} ${styles.page}`}><ResultsHeader onRestart={restart} />
    <main className={styles.container}>
      <nav aria-label="Calculator progress"><ol className={styles.progress}>{steps.map((s, i) => <li key={s} aria-current={s === step ? "step" : undefined}><span className={styles.dot}>{i + 1}</span><span>{stepLabels[s]}{state.completed.includes(s) && <small>Visited & validated</small>}</span></li>)}</ol></nav>
      <section className={styles.panel}><p className={styles.eyebrow}>Step {position + 1} of 7 · Your move comparison</p><h1 ref={heading} tabIndex={-1}>{stepTitles[step]}</h1>
        <p className={styles.intro}>{step === "review" ? "Review your entered inputs. Unknown costs stay unresolved; they are never replaced with estimates." : "Your current and destination details stay separate. Nothing is saved after you leave this calculator session."}</p>
        {errors.length > 0 && <div className={styles.errorSummary} role="alert" aria-label="Input errors" tabIndex={-1} ref={errorSummary}><h2>Check these inputs</h2><ul>{errors.map((e, i) => <li key={`${e.path}:${i}`}>{step === "review" ? <button type="button" onClick={() => { dispatch({ type: "EDIT" }); navigate(e.step); }}>{e.message} — {stepLabels[e.step]}</button> : <a href={`#${e.path}`}>{e.message}</a>}</li>)}</ul></div>}
        {failed && <p role="alert">The comparison could not be calculated. Your inputs are still here; please try again.</p>}
        <form noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={!hydrated || busy} className={styles.fields}>
            {step === "review" ? <><div className={styles.notice}>Unentered costs and unsupported evidence may make your result partial. These are your inputs, not calculated financial results. Childcare is outside the current scope.</div>
              {reviewSections(state.form).map((section) => <section className={styles.review} key={section.label}><div className={styles.reviewHeading}><h2>{section.label}</h2><button type="button" onClick={() => { dispatch({ type: "EDIT" }); navigate(section.step); }}>Edit {section.label}</button></div><div className={styles.columns}>{section.groups.map((group) => <div key={group.label}><h3>{group.label}</h3><dl>{group.rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></div>)}</div></section>)}</>
              : <>{shared.length > 0 && <fieldset className={styles.shared}><legend>Everyone moving together</legend><p>Household composition is shared. Costs and salary are not multiplied by these counts.</p>{shared.map((field) => <FormField key={field.path} field={field} errors={errors} step={step} />)}</fieldset>}
                <div className={styles.columns}>{roles.map((role) => <fieldset className={styles.scenario} key={role}><legend>{roleLabels[role]}</legend>{stepFields(state.form, step, role).map((field) => <FormField key={field.path} field={field} step={step} errors={errors} />)}</fieldset>)}</div>
                {["spending", "lifestyle"].includes(step) && <p className={styles.notice}>Enter your own household amounts. There is no automatic spending or lifestyle model. Childcare and payroll deductions are outside this calculation.</p>}</>}
            <div className={styles.actions}>{position > 0 ? <button type="button" className={styles.secondary} onClick={() => navigate(steps[position - 1])}>Back</button> : <span />}
              <button className={styles.primary} type="submit">{busy ? "Calculating…" : step === "review" ? "See my move reality" : state.editing ? "Save and return to review" : "Continue"} <span aria-hidden="true">→</span></button></div>
          </fieldset>
        </form>
        <p className={styles.privacy}>Progress tracks the steps you have visited and validated, not financial completeness. Refreshing clears your inputs.</p>
      </section>
    </main>
  </div>;
}
