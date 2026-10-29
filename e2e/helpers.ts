import type { Page } from "@playwright/test";

/**
 * Nombre d'enregistrements d'un store IndexedDB de l'app (lecture seule).
 * Ne crée jamais la base si elle n'existe pas, et referme la connexion : une connexion laissée ouverte
 * bloquerait la recréation de la base par l'app (après « Tout effacer », par exemple).
 */
export async function storeCount(page: Page, store: "words" | "games" | "rounds" | "players" | "hiddenWords" | "outbox") {
  return page.evaluate(async (s) => {
    const dbs = await indexedDB.databases();
    if (!dbs.some((d) => d.name === "lemezec")) return 0;
    const open = indexedDB.open("lemezec");
    const db: IDBDatabase = await new Promise((ok, ko) => { open.onsuccess = () => ok(open.result); open.onerror = ko; });
    try {
      if (!db.objectStoreNames.contains(s)) return 0;
      return await new Promise<number>((ok) => { const c = db.transaction(s).objectStore(s).count(); c.onsuccess = () => ok(c.result); });
    } finally {
      db.close();
    }
  }, store);
}

/** Parties en cours (lecture seule, connexion refermée). */
export async function gamesInProgress(page: Page) {
  return page.evaluate(async () => {
    const open = indexedDB.open("lemezec");
    const db: IDBDatabase = await new Promise((ok) => { open.onsuccess = () => ok(open.result); });
    try {
      const all: { status: string }[] = await new Promise((ok) => { const r = db.transaction("games").objectStore("games").getAll(); r.onsuccess = () => ok(r.result); });
      return all.filter((g) => g.status === "in_progress").length;
    } finally {
      db.close();
    }
  });
}

/** Aucune barre de défilement horizontale (mise en page qui déborde). */
export async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
