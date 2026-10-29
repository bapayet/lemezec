// F01 Jouer une partie : S01 -> S07 -> S08 -> S09/S10 -> … -> S11
import { test, expect, ready, startGame, currentWord, currentReader } from "./fixtures";
import { gamesInProgress, noHorizontalScroll, storeCount } from "./helpers";

test.describe("F01 jouer une partie", () => {
  test.beforeEach(async ({ page }) => { await ready(page); });

  test("F01-H1 chemin nominal : 3 joueurs, un tour complet, fin de partie", async ({ page, axe }) => {
    await page.getByRole("button", { name: "Lancer une partie" }).click();
    await expect(page).toHaveURL(/\/setup$/);
    await axe(page, "S07 configuration vide");

    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    for (const n of ["Alice", "Bruno", "Chloé"]) { await field.fill(n); await field.press("Enter"); }
    await expect(page.getByRole("list", { name: "Joueurs de la partie" }).getByRole("listitem")).toHaveCount(3);
    await axe(page, "S07 configuration remplie");
    await page.getByRole("button", { name: "C'est parti" }).click();

    await expect(page).toHaveURL(/\/game$/);
    await expect(page.getByText("Tour 1")).toBeVisible();
    expect(await currentReader(page)).toBe("Alice");
    await axe(page, "S08 mot caché");

    await page.getByRole("button", { name: "Voir la définition" }).click();
    await expect(page.getByText("Définition : Wiktionnaire, CC BY-SA")).toBeVisible();
    // le lecteur n'est pas dans la liste de ceux qui peuvent marquer
    await expect(page.getByRole("checkbox")).toHaveCount(2);
    await expect(page.getByRole("checkbox", { name: /^Alice/ })).toHaveCount(0);
    await page.getByRole("checkbox", { name: /^Bruno/ }).click();
    await page.getByRole("checkbox", { name: /^Chloé/ }).click();
    await expect(page.getByRole("checkbox", { name: /^Bruno/ })).toHaveAttribute("aria-checked", "true");
    await axe(page, "S09/S10 définition, gagnants, évaluation");
    await page.getByRole("button", { name: "Bien dosé" }).click();

    await expect(page.getByText("Tour 2")).toBeVisible();
    expect(await currentReader(page)).toBe("Bruno");
    const scores = page.getByRole("list", { name: "Classement" });
    await expect(scores.getByRole("listitem").first()).toContainText("Bruno");
    await expect(scores).toContainText("Alice0");

    await page.getByRole("button", { name: "Terminer" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Arrêter" }).click();
    await expect(page).toHaveURL(/\/game\/results\?id=/);
    await expect(page.getByRole("heading", { name: "Égalité : Bruno et Chloé" })).toBeVisible();
    await expect(page.getByText("1 mot joué · 1 trouvé")).toBeVisible();
    await axe(page, "S11 fin de partie");
  });

  test("F01-E1 rotation stricte du lecteur sur 5 tours (3 joueurs)", async ({ page }) => {
    await startGame(page, ["Ana", "Ben", "Cyd"]);
    const readers: string[] = [];
    for (let i = 0; i < 5; i++) {
      readers.push(await currentReader(page));
      await page.getByRole("button", { name: "Voir la définition" }).click();
      await page.getByRole("button", { name: "Mot suivant, sans noter" }).click();
      await expect(page.getByText(`Tour ${i + 2}`)).toBeVisible();
    }
    expect(readers).toEqual(["Ana", "Ben", "Cyd", "Ana", "Ben"]);
  });

  test("F01-E2 jamais deux fois le même mot dans une partie (12 tours)", async ({ page }) => {
    await startGame(page, ["Ana", "Ben"]);
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const w = await currentWord(page);
      expect(seen.has(w), `« ${w} » revient`).toBe(false);
      seen.add(w);
      await page.getByRole("button", { name: "Voir la définition" }).click();
      await page.getByRole("button", { name: "Mot suivant, sans noter" }).click();
      await expect(page.getByText(`Tour ${i + 2}`)).toBeVisible();
    }
    // et pas dans l'ordre alphabétique (défaut de l'original)
    const list = [...seen];
    expect(list).not.toEqual([...list].sort((a, b) => a.localeCompare(b, "fr")));
  });

  test("F01-E3 doublon de prénom refusé, casse et accents compris", async ({ page }) => {
    await page.goto("/setup");
    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    await field.fill("Élodie"); await field.press("Enter");
    await field.fill("élodie"); await field.press("Enter");
    await expect(page.getByText("élodie est déjà à la table.")).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("list", { name: "Joueurs de la partie" }).getByRole("listitem")).toHaveCount(1);
  });

  test("F01-E4 prénom très long et emoji : coupé à 40 caractères, rien ne déborde", async ({ page }) => {
    const long = "Maximilienne-Alexandrine de la Tour du Pin-Montauban";
    await startGame(page, [long, "Zoé 🦊"]);
    expect((await currentReader(page)).length).toBeLessThanOrEqual(40);
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByRole("button", { name: "Voir la définition" }).click();
    await expect(page.getByRole("checkbox", { name: /^Zoé 🦊/ })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("F01-E5 double clic sur « C'est parti » : une seule partie", async ({ page }) => {
    await page.goto("/setup");
    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    for (const n of ["Ana", "Ben"]) { await field.fill(n); await field.press("Enter"); }
    await page.getByRole("button", { name: "C'est parti" }).dblclick();
    await expect(page).toHaveURL(/\/game$/);
    await expect.poll(() => gamesInProgress(page)).toBe(1);
  });

  test("F01-E6 rechargement en plein tour : même mot, définition et gagnants conservés", async ({ page }) => {
    await startGame(page, ["Ana", "Ben"]);
    const word = await currentWord(page);
    await page.getByRole("button", { name: "Voir la définition" }).click();
    await page.getByRole("checkbox", { name: /^Ben/ }).click();
    await page.reload();
    await expect(page.locator("#mot")).toHaveText(word);
    await expect(page.getByRole("checkbox", { name: /^Ben/ })).toHaveAttribute("aria-checked", "true");
  });

  test("F01-E7 bouton retour en pleine partie : l'accueil propose de reprendre", async ({ page }) => {
    await page.getByRole("button", { name: "Lancer une partie" }).click();
    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    for (const n of ["Ana", "Ben"]) { await field.fill(n); await field.press("Enter"); }
    await page.getByRole("button", { name: "C'est parti" }).click();
    await expect(page).toHaveURL(/\/game$/);
    await page.goBack();
    await page.goto("/");
    await page.getByRole("button", { name: "Reprendre la partie" }).click();
    await expect(page).toHaveURL(/\/game$/);
    await expect(page.getByText("Tour 1")).toBeVisible();
  });

  test("F01-E8 retirer un mot puis annuler : le mot revient, le lecteur garde la main", async ({ page }) => {
    await startGame(page, ["Ana", "Ben"]);
    const word = await currentWord(page);
    await page.getByRole("button", { name: "Retirer ce mot de la pioche" }).click();
    await expect(page.locator("#mot")).not.toHaveText(word);
    expect(await currentReader(page)).toBe("Ana");
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.locator("#mot")).toHaveText(word);
    expect(await storeCount(page, "hiddenWords")).toBe(0);
  });

  test("F01-E9 retirer un mot sans annuler : il sort de la pioche des prochaines parties", async ({ page }) => {
    await startGame(page, ["Ana", "Ben"]);
    await page.getByRole("button", { name: "Retirer ce mot de la pioche" }).click();
    await expect.poll(() => storeCount(page, "hiddenWords")).toBe(1);
    expect(await storeCount(page, "outbox")).toBeGreaterThanOrEqual(1); // signalement en file
  });

  test("F01-E10 deux onglets sur la même partie restent synchronisés", async ({ page, context }) => {
    await startGame(page, ["Ana", "Ben"]);
    const other = await context.newPage();
    await other.goto("/game");
    await page.getByRole("button", { name: "Voir la définition" }).click();
    await page.getByRole("checkbox", { name: /^Ben/ }).click();
    await expect(other.getByRole("checkbox", { name: /^Ben/ })).toHaveAttribute("aria-checked", "true");
    await other.close();
  });

  test("F01-E11 hors ligne : on joue, l'évaluation attend le réseau puis part", async ({ page, context }) => {
    await startGame(page, ["Ana", "Ben"]);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Voir la définition" }).click();
    await page.getByRole("button", { name: "Corsé" }).click();
    await expect(page.getByText("Tour 2")).toBeVisible();
    expect(await storeCount(page, "outbox")).toBe(1);
    await context.setOffline(false);
    await expect.poll(() => storeCount(page, "outbox"), { timeout: 15_000 }).toBe(0);
  });

  test("F01-E12 au clavier seulement : configuration et un tour", async ({ page }) => {
    await page.goto("/setup");
    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    await field.focus();
    await page.keyboard.type("Ana"); await page.keyboard.press("Enter");
    await page.keyboard.type("Ben"); await page.keyboard.press("Enter");
    const start = page.getByRole("button", { name: "C'est parti" });
    await start.focus();
    await expect(start).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/game$/);
    const reveal = page.getByRole("button", { name: "Voir la définition" });
    await reveal.focus(); await page.keyboard.press("Space");
    const ben = page.getByRole("checkbox", { name: /^Ben/ });
    await ben.focus(); await page.keyboard.press("Space");
    await expect(ben).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Trop facile" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Tour 2")).toBeVisible();
  });

  test("F01-N1 moins de deux joueurs : impossible de lancer, raison affichée", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByRole("button", { name: "C'est parti" })).toBeDisabled();
    await expect(page.getByText("Il faut au moins deux joueurs.")).toBeVisible();
  });

  test("F01-N2 aucun niveau coché : impossible de lancer", async ({ page }) => {
    await page.goto("/setup");
    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    for (const n of ["Ana", "Ben"]) { await field.fill(n); await field.press("Enter"); }
    const pressed = page.getByRole("button", { pressed: true });
    while (await pressed.count()) await pressed.first().click();
    await expect(page.getByText("Choisissez au moins un niveau.")).toBeVisible();
    await expect(page.getByRole("button", { name: "C'est parti" })).toBeDisabled();
  });

  test("F01-N3 /game sans partie en cours : renvoi vers la configuration", async ({ page }) => {
    await page.goto("/game");
    await expect(page).toHaveURL(/\/setup$/);
  });

  test("F01-N4 résultats d'une partie inconnue : message clair", async ({ page }) => {
    await page.goto("/game/results?id=inconnue");
    await expect(page.getByRole("heading", { name: "Partie introuvable" })).toBeVisible();
  });

  test("F01-E13 @desktop mise en page à 1 440 px : colonne centrée, rien ne déborde", async ({ page }) => {
    await startGame(page, ["Ana", "Ben"]);
    expect(await noHorizontalScroll(page)).toBe(true);
    const box = await page.locator("main").boundingBox();
    expect(box!.width).toBeLessThanOrEqual(480);
  });
});
