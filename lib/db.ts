import Dexie, { type EntityTable } from "dexie";
import type { Game, OutboxItem, Player, Round, Word } from "./types";

type Meta = { key: string; value: unknown };
type HiddenWord = { wordId: string; hiddenAt: string };

// Tout ce qui concerne une partie vit ici, sur l'appareil. Le serveur ne connaît que les mots.
export const db = new Dexie("lemezec") as Dexie & {
  words: EntityTable<Word, "id">;
  meta: EntityTable<Meta, "key">;
  players: EntityTable<Player, "nameKey">;
  games: EntityTable<Game, "id">;
  rounds: EntityTable<Round, "id">;
  hiddenWords: EntityTable<HiddenWord, "wordId">;
  outbox: EntityTable<OutboxItem, "id">;
};

db.version(1).stores({
  words: "id, difficulty, status, updatedAt",
  meta: "key",
  players: "nameKey, lastPlayedAt",
  games: "id, status, startedAt",
  rounds: "id, gameId, wordId, [gameId+number]",
  hiddenWords: "wordId",
  outbox: "id, kind, createdAt",
});

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}

export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
