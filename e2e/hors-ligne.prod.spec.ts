// F05 hors ligne complet, sur une compilation de production : service worker + IndexedDB.
import { test, expect, ready } from "./fixtures";
import { storeCount } from "./helpers";

/** Attend que le service worker contrôle la page et que le précache soit rempli. */
async function swReady(page: import("@playwright/test").Page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg.active) && Boolean(navigator.serviceWorker.controller);
  }, undefined, { timeout: 30_000 }).catch(async () => {
    await page.reload(); // la première visite installe ; la page n'est contrôlée qu'après
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 30_000 });
  });
  await expect.poll(() => page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      const keys = (await c.keys()).map((r) => new URL(r.url).pathname);
      if (keys.includes("/setup") && keys.includes("/rules")) return true;
    }
    return false;
  }), { timeout: 30_000, message: "les pages doivent être précachées" }).toBe(true);
}

/**
 * Vraie coupure réseau. `setOffline` seul ne coupe pas le service worker sous Chromium : ses requêtes
 * atteindraient encore le serveur. On bloque donc aussi tout le trafic du contexte, service worker compris.
 */
async function goOffline(context: import("@playwright/test").BrowserContext, guard: { offline: boolean }) {
  guard.offline = true;
  await context.setOffline(true);
  await context.route("**/*", (route) => route.abort("internetdisconnected"));
}
async function goOnline(context: import("@playwright/test").BrowserContext, guard: { offline: boolean }) {
  await context.unrouteAll({ behavior: "ignoreErrors" });
  await context.setOffline(false);
  guard.offline = false;
}

test.describe("F05 hors ligne complet (production)", () => {
  test("F05-H2 installable : manifeste, icônes, service worker", async ({ page, request }) => {
    const m = await (await request.get("/manifest.webmanifest")).json();
    expect(m).toMatchObject({ short_name: "Lemezec", display: "standalone", start_url: "/", lang: "fr" });
    for (const icon of m.icons) expect((await request.get(icon.src)).status()).toBe(200);
    expect(m.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
    await ready(page);
    await swReady(page);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  });

  test("F05-H3 sans réseau : toutes les pages s'ouvrent, même jamais visitées, et une partie se joue jusqu'au bout", async ({ page, context, guard }) => {
    await ready(page);
    await swReady(page);
    await goOffline(context, guard);

    // pages jamais visitées dans cette session
    for (const [path, heading] of [["/rules", "Comment jouer"], ["/history", "Parties"], ["/statistics", "Statistiques"], ["/settings", "Réglages"]] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
    await expect(page.getByRole("status").filter({ hasText: "Hors ligne" })).toBeVisible();

    // une partie complète, hors ligne
    await page.goto("/setup");
    const field = page.getByRole("textbox", { name: "Prénom du joueur" });
    for (const n of ["Ana", "Ben"]) { await field.fill(n); await field.press("Enter"); }
    await page.getByRole("button", { name: "C'est parti" }).click();
    await expect(page).toHaveURL(/\/game$/);
    await page.getByRole("button", { name: "Voir la définition" }).click();
    await page.getByRole("checkbox", { name: /^Ben/ }).click();
    await page.getByRole("button", { name: "Corsé" }).click();
    await expect(page.getByText("Tour 2")).toBeVisible();
    expect(await storeCount(page, "outbox")).toBe(1);
    await page.getByRole("button", { name: "Terminer" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Arrêter" }).click();
    await expect(page).toHaveURL(/\/game\/results\?id=/); // BUG-007 : on retombait sur l'accueil
    await expect(page.getByRole("heading", { name: "Ben gagne !" })).toBeVisible();

    // le détail dans l'historique, hors ligne, par un rechargement complet
    await page.goto("/history");
    await page.getByRole("link", { name: /Ana et Ben/ }).click();
    await expect(page).toHaveURL(/\/history\/partie\?id=/);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Ben gagne !" })).toBeVisible();

    // de retour en ligne : la note en attente part
    await goOnline(context, guard);
    await page.goto("/");
    await expect.poll(() => storeCount(page, "outbox"), { timeout: 20_000 }).toBe(0);
  });

  test("F05-N2 l'API n'est jamais servie depuis un cache", async ({ page, context, guard }) => {
    await ready(page);
    await swReady(page);
    await goOffline(context, guard);
    const outcome = await page.evaluate(async () => {
      try { const r = await fetch("/api/words/sync"); return `réponse ${r.status}`; } catch { return "échec réseau"; }
    });
    expect(outcome).toBe("échec réseau");
    for (const name of await page.evaluate(() => caches.keys())) {
      const urls = await page.evaluate(async (n) => (await (await caches.open(n)).keys()).map((r) => r.url), name);
      // réponses d'API (/api/…, /auth/…), pas les fichiers JS de la compilation qui contiennent « api » dans leur chemin
      expect(urls.filter((u) => /^\/(api|auth)\//.test(new URL(u).pathname)), `cache ${name}`).toEqual([]);
    }
    await goOnline(context, guard);
  });
});
