// Fixtures communes : chaque test échoue sur une erreur de console ou une réponse 5xx,
// et propose un scan d'accessibilité axe (WCAG 2.2 AA).
import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { storeCount } from "./helpers";

type Fixtures = { guard: { errors: string[] }; axe: (page: Page, label: string) => Promise<void> };

export const test = base.extend<Fixtures>({
  guard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const t = m.text();
        // bruit du serveur de dev (rechargement à chaud), pas l'app
        if (/webpack-hmr|Fast Refresh/.test(t)) return;
        // hors ligne simulé : les requêtes échouent, c'est attendu
        if (/ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED/.test(t)) return;
        errors.push(`console : ${t}`);
      });
      page.on("pageerror", (e) => {
        // morceau de rechargement à chaud que seul le serveur de dev charge à la demande
        if (/noop-turbopack-hmr|webpack-hmr/.test(e.message)) return;
        errors.push(`exception : ${e.message}`);
      });
      page.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} sur ${r.url()}`); });
      await use({ errors });
      expect(errors, "erreurs de console ou réponses 5xx").toEqual([]);
    },
    { auto: true },
  ],
  axe: async ({}, use) => {
    await use(async (page, label) => {
      // mouvements réduits : l'app raccourcit ses transitions, axe mesure les couleurs finales et non une animation en cours
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(50);
      // @axe-core/playwright est typé sur sa propre copie de playwright-core : même objet à l'exécution
      const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const v = r.violations.map((x) => `${x.id} (${x.impact}) : ${x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
      expect(v, `accessibilité : ${label}`).toEqual([]);
    });
  },
});

export { expect };

/** Ouvre l'app et attend que la base de mots soit en cache (synchro au premier lancement). */
export async function ready(page: Page, path = "/") {
  await page.goto(path);
  await expect.poll(() => storeCount(page, "words"), { timeout: 20_000, message: "les mots doivent être synchronisés" }).toBeGreaterThan(1000);
}

/** Configure une partie avec ces joueurs (niveaux par défaut) et arrive sur /game. */
export async function startGame(page: Page, players: string[]) {
  await page.goto("/setup");
  const field = page.getByRole("textbox", { name: "Prénom du joueur" });
  for (const p of players) {
    await field.fill(p);
    await field.press("Enter");
  }
  await page.getByRole("button", { name: "C'est parti" }).click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.getByRole("heading", { level: 2, name: /.+/ }).first()).toBeVisible();
}

export const currentWord = (page: Page) => page.locator("#mot").innerText();
export const currentReader = (page: Page) => page.getByText("Lecteur", { exact: true }).locator("xpath=following-sibling::p").innerText();
