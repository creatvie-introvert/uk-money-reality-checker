import { defineConfig, devices } from "@playwright/test";
const externalBaseURL = process.env.SMOKE_BASE_URL;
if (externalBaseURL) {
  if (!process.env.SMOKE_EXPECT_SITE_URL) throw new Error("Deployed smoke checks require SMOKE_EXPECT_SITE_URL");
  const url = new URL(externalBaseURL);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("SMOKE_BASE_URL must be an explicitly supplied site origin");
}
export default defineConfig({
  testDir: "./e2e-production", fullyParallel: false, retries: 0, timeout: 90000,
  reporter: "list", outputDir: "test-results-production",
  use: { baseURL: externalBaseURL ?? "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: externalBaseURL ? undefined : { command: "npm run start -- --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }, { name: "webkit", use: { ...devices["Desktop Safari"] } }],
});
