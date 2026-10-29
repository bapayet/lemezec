import { defineConfig, devices } from "@playwright/test";

// Tests du hors-ligne sur une COMPILATION DE PRODUCTION (le service worker n'existe pas en dev).
// Même isolement que la config principale : mode local forcé, dossier de build à part.
// usage : npx playwright test -c playwright.prod.config.ts
const PORT = 3200;

// Sans ce réglage, Chromium laisse le service worker joindre le réseau même « hors ligne » :
// les tests passeraient sans rien prouver (vérifié : une URL jamais vue revenait en 200).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /\.prod\.spec\.ts$/,
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile-prod", use: { ...devices["Pixel 7"], browserName: "chromium" } }],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/admin/me`,
    reuseExistingServer: false,
    timeout: 420_000,
    env: {
      NEXT_DIST_DIR: ".next-prod",
      NEXT_PUBLIC_FORCE_LOCAL: "1",
      PW_BASE_URL: `http://localhost:${PORT}`,
      CRON_SECRET: "e2e-secret-local-uniquement",
    },
  },
});
