// Captures du clone pour /replica-diff, dans le même état que les captures de l'original (replica/screens).
// Lancé seulement à la demande : npx playwright test --project=capture
import { test, expect, ready, startGame } from "./fixtures";

const OUT = "../replica/clone-screens/diff";
const shot = (page: import("@playwright/test").Page, id: string) =>
  page.screenshot({ path: `${OUT}/${id}.png`, animations: "disabled" });

test.describe("@capture captures pour la comparaison", () => {
  test.beforeEach(async ({ page }) => { await ready(page); });

  test("S01 S02 S03 S04 S05 S07 S08 S09 @capture", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Lancer une partie" })).toBeVisible();
    await shot(page, "S01");

    await page.goto("/rules");
    await expect(page.getByRole("heading", { level: 1, name: "Comment jouer" })).toBeVisible();
    await shot(page, "S02");

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Pas encore de partie" })).toBeVisible();
    await shot(page, "S03");

    await page.goto("/statistics");
    await expect(page.getByRole("heading", { name: "Rien à compter pour l'instant" })).toBeVisible();
    await shot(page, "S04");

    await page.goto("/settings");
    await expect(page.getByText(/1\s?438 mots/)).toBeVisible();
    await shot(page, "S05");

    await page.goto("/setup");
    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    for (const n of ["Baptiste", "Franck"]) { await field.fill(n); await field.press("Enter"); }
    await field.blur();
    await shot(page, "S07");

    await startGame(page, ["Baptiste", "Franck"]);
    await shot(page, "S08");
    await page.getByRole("button", { name: "Voir la définition" }).click();
    await expect(page.getByRole("checkbox", { name: /^Franck/ })).toBeVisible();
    await shot(page, "S09");
  });
});
