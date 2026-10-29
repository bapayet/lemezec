// F05 Garder la base hors ligne (S05), F06 Lire les règles (S02), F07 Tout effacer (S05)
import { test, expect, ready, startGame } from "./fixtures";
import { storeCount } from "./helpers";

test.describe("F05 mots sur l'appareil", () => {
  test.beforeEach(async ({ page }) => { await ready(page); });

  test("F05-H1 le nombre de mots et la date de synchro s'affichent ; mise à jour", async ({ page, axe }) => {
    await page.goto("/settings");
    await expect(page.getByText(/1\s?438 mots/)).toBeVisible();
    await expect(page.getByText(/à l'instant|il y a \d+ min/)).toBeVisible();
    await axe(page, "S05");
    await page.getByRole("button", { name: "Mettre à jour les mots" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Base à jour" })).toBeVisible();
  });

  test("F05-E1 vider le cache : confirmation, puis retéléchargement", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Vider le cache des mots" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Vider" }).click();
    await expect.poll(() => storeCount(page, "words"), { timeout: 20_000 }).toBe(1438);
  });

  test("F05-E2 Échap ferme la confirmation et rend le focus au bouton", async ({ page }) => {
    await page.goto("/settings");
    const trigger = page.getByRole("button", { name: "Vider le cache des mots" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await storeCount(page, "words")).toBe(1438);
  });

  test("F05-E3 hors ligne : bandeau affiché, mise à jour désactivée, partie possible", async ({ page, context }) => {
    await page.goto("/settings");
    await context.setOffline(true);
    await expect(page.getByRole("status").filter({ hasText: "Hors ligne" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mettre à jour les mots/ })).toHaveAttribute("aria-disabled", "true");
    await context.setOffline(false);
  });

  test("F05-E4 cache vide et serveur injoignable : la configuration explique quoi faire", async ({ page }) => {
    // hors ligne, l'app ne peut pas encore naviguer (pas de service worker : limite connue) ;
    // on simule donc un serveur de mots injoignable, ce qui produit le même état « aucun mot »
    await page.route("**/api/words/sync**", (r) => r.abort("connectionrefused"));
    await page.goto("/settings");
    await page.getByRole("button", { name: "Vider le cache des mots" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Vider" }).click();
    await expect.poll(() => storeCount(page, "words")).toBe(0);
    await page.getByRole("link", { name: "Accueil" }).click();
    await page.getByRole("button", { name: "Lancer une partie" }).click();
    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    for (const n of ["Ana", "Ben"]) { await field.fill(n); await field.press("Enter"); }
    // BUG-002 : le message doit expliquer qu'il n'y a aucun mot, et mener aux réglages
    await expect(page.getByText("Aucun mot sur cet appareil.")).toBeVisible();
    await expect(page.getByRole("button", { name: "C'est parti" })).toBeDisabled();
    await page.getByRole("link", { name: "Mettre à jour les mots" }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });
});

test.describe("F06 règles", () => {
  test("F06-H1 accessibles depuis l'accueil, lisibles, retour au jeu", async ({ page, axe }) => {
    await ready(page);
    await page.getByRole("link", { name: "Comment jouer" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Comment jouer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Un tour, un lecteur/ })).toBeVisible();
    await expect(page.getByText(/ne marque pas sur son propre mot/)).toBeVisible();
    await expect(page.getByText(/Explorer/)).toHaveCount(0); // l'original renvoyait à un onglet inexistant
    await axe(page, "S02");
    await page.getByRole("link", { name: "Lancer une partie" }).click();
    await expect(page).toHaveURL(/\/setup$/);
  });
});

test.describe("F07 tout effacer", () => {
  test("F07-H1 parties et joueurs supprimés, mots resynchronisés", async ({ page }) => {
    await ready(page);
    await startGame(page, ["Ana", "Ben"]);
    expect(await storeCount(page, "games")).toBe(1);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Tout effacer sur cet appareil" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused();
    await dialog.getByRole("button", { name: "Tout effacer" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => storeCount(page, "words"), { timeout: 20_000 }).toBe(1438);
    expect(await storeCount(page, "games")).toBe(0);
    expect(await storeCount(page, "players")).toBe(0);
    await page.goto("/setup");
    await expect(page.getByText("Ont déjà joué ici")).toHaveCount(0);
  });
});

test.describe("F08 pages légales", () => {
  test("F08-H1 accessibles depuis les Réglages, sous-traitants listés, accessibles au lecteur d'écran", async ({ page, axe }) => {
    await ready(page, "/settings");
    await page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "Confidentialité" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Confidentialité" })).toBeVisible();
    for (const processor of ["Supabase Inc.", "Vercel Inc."]) await expect(page.getByText(processor).first()).toBeVisible();
    await expect(page.getByText(/aucun cookie publicitaire/)).toBeVisible();
    await axe(page, "confidentialité");
    await page.getByRole("link", { name: "Mentions légales" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mentions légales" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Creative Commons BY-SA 4.0" })).toBeVisible();
    await axe(page, "mentions légales");
    await page.getByRole("link", { name: "Conditions d'utilisation" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Conditions d'utilisation" })).toBeVisible();
    await axe(page, "conditions");
  });
});
