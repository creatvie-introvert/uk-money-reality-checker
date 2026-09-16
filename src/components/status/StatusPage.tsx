/* eslint-disable @next/next/no-html-link-for-pages -- Recovery links intentionally reload to discard failed client state. */
import styles from "./status.module.css";
export function StatusPage({ missing = false, retry, embedded = false }: { missing?: boolean; retry?: () => void; embedded?: boolean }) {
  const Container = embedded ? "section" : "main";
  return <Container className={styles.page} id="status-main"><p>UK Money Reality</p><h1>{missing ? "We couldn’t find that page" : "This page couldn’t be loaded"}</h1>
    <p>{missing ? "Check the address or return to the product to continue." : "Please try again. Returning to the calculator starts a fresh comparison; your previous inputs may need to be entered again."}</p>
    <div className={styles.actions}>{retry && <button onClick={retry}>Try again</button>}<a href="/">Back to home</a><a href="/calculator">Start a comparison</a></div>
  </Container>;
}
