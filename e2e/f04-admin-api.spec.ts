// F04 Importer des mots (admin) + contrôles négatifs de l'API.
// Le serveur de test est en mode local : l'espace admin doit l'indiquer, et l'API refuser proprement.
// Les règles d'accès Supabase (deuxième utilisateur, anonyme, admin) sont testées par `npm run test:rls`.
import { test, expect } from "./fixtures";

const RATING = { id: "6f1c2d3e-0000-4000-8000-000000000001", wordId: "000e2d3b-886c-5521-a9f9-b4379b952a12", rating: "bien", found: true, ratedAt: "2026-10-28T14:00:00.000Z" };

test.describe("F04 espace admin en mode local", () => {
  for (const [path, title] of [["/admin/login", "Espace admin"], ["/admin/import", "Importer des mots"], ["/admin/review", "Relecture"]] as const) {
    test(`F04-E1 ${path} : « Serveur non configuré », sans erreur`, async ({ page, axe }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Serveur non configuré" })).toBeVisible();
      await axe(page, path);
    });
  }
});

test.describe("API : entrées refusées", () => {
  test("N1 évaluations : forme invalide, lot vide, lot de 101", async ({ request }) => {
    expect((await request.post("/api/ratings", { data: [{ id: "x" }] })).status()).toBe(400);
    expect((await request.post("/api/ratings", { data: [] })).status()).toBe(400);
    const big = Array.from({ length: 101 }, (_, i) => ({ ...RATING, id: `6f1c2d3e-0000-4000-8000-${String(i).padStart(12, "0")}` }));
    expect((await request.post("/api/ratings", { data: big })).status()).toBe(400);
    expect((await request.post("/api/ratings", { data: { not: "an array" } })).status()).toBe(400);
  });

  test("N2 évaluation valide en mode local : acceptée puis jetée", async ({ request }) => {
    const r = await request.post("/api/ratings", { data: [RATING] });
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject({ accepted: 0, dropped: 1, mode: "local" });
  });

  test("N3 signalement : id invalide, raison inconnue", async ({ request }) => {
    expect((await request.post("/api/reports", { data: { wordId: "pas-un-uuid" } })).status()).toBe(400);
    expect((await request.post("/api/reports", { data: { wordId: RATING.wordId, reason: "spam" } })).status()).toBe(400);
  });

  test("N4 synchro : curseur piégé refusé, pagination complète", async ({ request }) => {
    expect((await request.get("/api/words/sync?after=x),or(status.eq.pending")).status()).toBe(400);
    const p1 = await (await request.get("/api/words/sync")).json();
    expect(p1.words).toHaveLength(1000);
    const c = `${p1.nextCursor.updatedAt},${p1.nextCursor.id}`;
    const p2 = await (await request.get(`/api/words/sync?after=${encodeURIComponent(c)}`)).json();
    expect(p2.done).toBe(true);
    expect(p1.words.length + p2.words.length).toBe(1438);
    const ids = new Set([...p1.words, ...p2.words].map((w: { id: string }) => w.id));
    expect(ids.size).toBe(1438); // aucun mot en double entre deux pages
  });

  test("N5 cron : refusé sans secret ou avec un mauvais secret", async ({ request }) => {
    expect((await request.get("/api/cron/recompute-difficulty")).status()).toBe(401);
    expect((await request.get("/api/cron/recompute-difficulty", { headers: { authorization: "Bearer faux" } })).status()).toBe(401);
  });

  test("N6 routes admin en mode local : 503, jamais de données", async ({ request }) => {
    expect((await request.post("/api/admin/import/wiktionary", { data: { words: ["bibliopole"], difficulty: "moyen" } })).status()).toBe(503);
    expect((await request.get("/api/admin/words?status=pending")).status()).toBe(503);
    expect((await request.get("/api/admin/reports")).status()).toBe(503);
  });

  test("N7 retour du lien magique : pas de redirection vers un site extérieur", async ({ request }) => {
    const r = await request.get("/auth/callback?code=x&next=https://evil.example", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers().location).toMatch(/\/admin\/login\?erreur=lien$/);
  });
});
