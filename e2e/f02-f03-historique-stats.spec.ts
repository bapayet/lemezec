// F02 Revoir les parties passées (S03 -> S12) et F03 Consulter les statistiques (S04)
import { test, expect, ready, startGame } from "./fixtures";

async function playOneAndFinish(page: import("@playwright/test").Page, players: string[], finder: string) {
  await startGame(page, players);
  await page.getByRole("button", { name: "Voir la définition" }).click();
  await page.getByRole("checkbox", { name: new RegExp(`^${finder}`) }).click();
  await page.getByRole("button", { name: "Introuvable" }).click();
  await page.getByRole("button", { name: "Voir la définition" }).click();
  await page.getByRole("button", { name: "Mot suivant, sans noter" }).click();
  await page.getByRole("button", { name: "Terminer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Arrêter" }).click();
  await expect(page).toHaveURL(/\/game\/results/);
}

test.describe("F02 historique", () => {
  test.beforeEach(async ({ page }) => { await ready(page); });

  test("F02-E1 historique vide : message et action pour lancer une partie", async ({ page, axe }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Pas encore de partie" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lancer une partie" })).toBeVisible();
    await axe(page, "S03 vide");
  });

  test("F02-H1 la partie terminée apparaît, son détail liste les mots", async ({ page, axe }) => {
    await playOneAndFinish(page, ["Ana", "Ben"], "Ben");
    await page.goto("/history");
    const row = page.getByRole("link", { name: /Ana et Ben/ });
    await expect(row).toContainText("Ben · 2 mots");
    await axe(page, "S03 rempli");
    await row.click();
    await expect(page).toHaveURL(/\/history\/partie\?id=[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Ben gagne !" })).toBeVisible();
    await expect(page.getByText("Trouvé par Ben · lu par Ana")).toBeVisible();
    await expect(page.getByText("Introuvable", { exact: true })).toBeVisible();
    await axe(page, "S12 détail");
  });

  test("F02-H2 rejouer avec la même tablée depuis le détail", async ({ page }) => {
    await playOneAndFinish(page, ["Ana", "Ben"], "Ben");
    await page.goto("/history");
    await page.getByRole("link", { name: /Ana et Ben/ }).click();
    await page.getByRole("button", { name: "Rejouer avec cette tablée" }).click();
    await expect(page).toHaveURL(/\/game$/);
    await expect(page.getByText("Tour 1")).toBeVisible();
  });

  test("F02-N1 supprimer une partie : confirmation, puis elle disparaît", async ({ page }) => {
    await playOneAndFinish(page, ["Ana", "Ben"], "Ben");
    await page.goto("/history");
    await page.getByRole("link", { name: /Ana et Ben/ }).click();
    await page.getByRole("button", { name: "Supprimer de l'historique" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused(); // action destructive
    await dialog.getByRole("button", { name: "Supprimer" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByRole("heading", { name: "Pas encore de partie" })).toBeVisible();
  });

  test("F02-N2 détail d'une partie supprimée ou inconnue", async ({ page }) => {
    await page.goto("/history/partie?id=00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "Partie introuvable" })).toBeVisible();
  });
});

test.describe("F03 statistiques", () => {
  test.beforeEach(async ({ page }) => { await ready(page); });

  test("F03-E1 aucune partie : zéros et message", async ({ page, axe }) => {
    await page.goto("/statistics");
    await expect(page.getByRole("heading", { name: "Rien à compter pour l'instant" })).toBeVisible();
    await axe(page, "S04 vide");
  });

  test("F03-H1 après une partie : parties, mots, taux, champion, mot non trouvé", async ({ page, axe }) => {
    await playOneAndFinish(page, ["Ana", "Ben"], "Ben");
    await page.goto("/statistics");
    const main = page.getByRole("main");
    await expect(main.getByText("Parties", { exact: true }).locator("..")).toContainText("1");
    await expect(main.getByText("Mots joués").locator("..")).toContainText("2");
    await expect(main.getByText("Trouvés", { exact: true }).locator("..")).toContainText("50 %");
    await expect(page.getByRole("heading", { name: "Champions" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Ben" }).first()).toContainText("1 victoire");
    await expect(page.getByRole("heading", { name: "Mots que personne n'a trouvés" })).toBeVisible();
    await axe(page, "S04 rempli");
  });
});
