import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Serveur dédié aux tests, forcé en MODE LOCAL : variables Supabase vides (Next ne remplace pas une variable
// déjà définie par .env.local). Les tests n'écrivent donc jamais dans le vrai projet Supabase.
// e2e/global-setup.ts vérifie ce point avant le moindre test.
export default defineConfig({
  testDir: "./e2e",
  testIgnore: /\.prod\.spec\.ts$/, // hors-ligne : voir playwright.prod.config.ts
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" }, grepInvert: /@desktop|@capture/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, grep: /@desktop/, grepInvert: /@capture/ },
    // captures pour /replica-diff : même viewport que les captures de l'original (375×812, densité 1)
    { name: "capture", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: false }, grep: /@capture/ },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/admin/me`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_FORCE_LOCAL: "1",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      CRON_SECRET: "e2e-secret-local-uniquement",
    },
  },
});
