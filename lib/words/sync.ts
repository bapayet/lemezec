// Synchro incrémentale de la base de mots vers IndexedDB.
// Curseur (updatedAt, id) plutôt que updatedAt seul : aucun mot perdu à milliseconde égale.
import { db, getMeta, now, setMeta } from "../db";
import type { SyncCursor, Word } from "../types";

type SyncPage = { words: Word[]; nextCursor: SyncCursor | null; done: boolean };

export type SyncResult = { added: number; total: number; at: string };

let running: Promise<SyncResult> | null = null;

export function syncWords(): Promise<SyncResult> {
  running ??= run().finally(() => { running = null; });
  return running;
}

async function run(): Promise<SyncResult> {
  let cursor = await getMeta<SyncCursor>("syncCursor");
  let added = 0;
  for (let page = 0; page < 50; page++) {
    const qs = cursor ? `?after=${encodeURIComponent(`${cursor.updatedAt},${cursor.id}`)}` : "";
    const res = await fetch(`/api/words/sync${qs}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Synchro impossible (${res.status})`);
    const data = (await res.json()) as SyncPage;
    if (data.words.length) {
      // les mots « hidden » sont des pierres tombales : ils restent en base pour masquer les copies locales
      await db.words.bulkPut(data.words);
      added += data.words.length;
    }
    if (data.nextCursor) {
      cursor = data.nextCursor;
      await setMeta("syncCursor", cursor);
    }
    if (data.done) break;
  }
  const at = now();
  await setMeta("lastSyncAt", at);
  return { added, total: await db.words.where("status").equals("active").count(), at };
}

export async function clearWordCache() {
  await db.transaction("rw", db.words, db.meta, async () => {
    await db.words.clear();
    await db.meta.bulkDelete(["syncCursor", "lastSyncAt"]);
  });
}
