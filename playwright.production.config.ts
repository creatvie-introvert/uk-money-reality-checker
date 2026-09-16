import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-production", fullyParallel: false, retries: 0, timeout: 90000,
  reporter: "list", outputDir: "test-results-production",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: { command: "npm run start -- --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }, { name: "webkit", use: { ...devices["Desktop Safari"] } }],
});
