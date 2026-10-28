// Opérations d'une partie. Chaque action est écrite dans IndexedDB avant d'être affichée :
// un rechargement reprend exactement où on en était.
import { db, newId, now } from "../db";
import { enqueue } from "../outbox";
import { effectiveDifficulty, type Difficulty, type Game, type Rating } from "../types";
import { buildDeck, cleanName, nameKey, readerFor } from "./logic";

const RECENT_GAMES = 10;

export async function eligibleWordIds(difficulties: Difficulty[]) {
  const hidden = new Set((await db.hiddenWords.toArray()).map((h) => h.wordId));
  const wanted = new Set(difficulties);
  return (await db.words.where("status").equals("active").toArray())
    .filter((w) => !hidden.has(w.id) && wanted.has(effectiveDifficulty(w)))
    .map((w) => w.id);
}

export async function countByDifficulty() {
  const hidden = new Set((await db.hiddenWords.toArray()).map((h) => h.wordId));
  const counts: Record<Difficulty, number> = { simple: 0, moyen: 0, difficile: 0, tres_difficile: 0 };
  for (const w of await db.words.where("status").equals("active").toArray()) {
    if (!hidden.has(w.id)) counts[effectiveDifficulty(w)]++;
  }
  return counts;
}

async function recentlyPlayedWordIds() {
  const games = await db.games.orderBy("startedAt").reverse().limit(RECENT_GAMES).toArray();
  const ids = new Set<string>();
  for (const g of games) for (const r of await db.rounds.where("gameId").equals(g.id).toArray()) ids.add(r.wordId);
  return ids;
}

export async function currentGame() {
  return db.games.where("status").equals("in_progress").reverse().sortBy("startedAt").then((g) => g[0]);
}

export async function startGame(names: string[], difficulties: Difficulty[]) {
  const seats = names.map(cleanName).filter(Boolean);
  if (seats.length < 2) throw new Error("Il faut au moins 2 joueurs.");
  if (new Set(seats.map(nameKey)).size !== seats.length) throw new Error("Deux joueurs ont le même prénom.");
  if (!difficulties.length) throw new Error("Choisissez au moins un niveau.");
  const deck = buildDeck(await eligibleWordIds(difficulties), await recentlyPlayedWordIds());
  if (!deck.length) throw new Error("Aucun mot disponible pour ces niveaux.");

  const game: Game = {
    id: newId(), status: "in_progress", startedAt: now(), endedAt: null,
    difficulties, seats, deck, cursor: 0, roundNumber: 1, phase: "hidden", finders: [],
  };
  await db.transaction("rw", db.games, db.players, async () => {
    // une seule partie en cours à la fois : l'ancienne est close telle quelle
    const open = await db.games.where("status").equals("in_progress").toArray();
    for (const g of open) await db.games.update(g.id, { status: "finished", endedAt: now() });
    await db.games.add(game);
    const stamp = now();
    await db.players.bulkPut(seats.map((name) => ({ nameKey: nameKey(name), name, lastPlayedAt: stamp })));
  });
  return game;
}

export async function reveal(gameId: string) {
  await db.games.update(gameId, { phase: "revealed" });
}

export async function toggleFinder(game: Game, name: string) {
  if (name === readerFor(game)) return; // le lecteur ne marque pas sur son propre mot
  const finders = game.finders.includes(name) ? game.finders.filter((f) => f !== name) : [...game.finders, name];
  await db.games.update(game.id, { finders });
}

/** Clôt le tour (gagnants + évaluation facultative) et passe au mot et au lecteur suivants, en une seule écriture. */
export async function completeRound(game: Game, rating: Rating | null) {
  const wordId = game.deck[game.cursor];
  const roundId = newId();
  await db.transaction("rw", db.games, db.rounds, db.outbox, async () => {
    await db.rounds.add({
      id: roundId, gameId: game.id, number: game.roundNumber, wordId,
      reader: readerFor(game), finders: game.finders, rating, createdAt: now(),
    });
    await db.games.update(game.id, { cursor: game.cursor + 1, roundNumber: game.roundNumber + 1, phase: "hidden", finders: [] });
    if (rating) {
      await enqueue({ kind: "rating", payload: { id: roundId, wordId, rating, found: game.finders.length > 0, ratedAt: now() } });
    }
  });
}

/** « Retirer ce mot » : masqué sur l'appareil, signalé au serveur ; le même lecteur garde la main. */
export async function removeCurrentWord(game: Game) {
  const wordId = game.deck[game.cursor];
  await db.transaction("rw", db.games, db.hiddenWords, db.outbox, async () => {
    await db.hiddenWords.put({ wordId, hiddenAt: now() });
    await db.games.update(game.id, { cursor: game.cursor + 1, phase: "hidden", finders: [] });
    await enqueue({ kind: "report", payload: { wordId, reason: "other" } });
  });
  return wordId;
}

export async function undoRemoveWord(gameId: string, wordId: string) {
  await db.transaction("rw", db.games, db.hiddenWords, db.outbox, async () => {
    const game = await db.games.get(gameId);
    if (!game || game.deck[game.cursor - 1] !== wordId) return;
    await db.hiddenWords.delete(wordId);
    await db.games.update(gameId, { cursor: game.cursor - 1, phase: "hidden", finders: [] });
    const pending = await db.outbox.where("kind").equals("report").toArray();
    const report = pending.find((o) => o.kind === "report" && o.payload.wordId === wordId);
    if (report) await db.outbox.delete(report.id);
  });
}

export async function endGame(gameId: string) {
  await db.games.update(gameId, { status: "finished", endedAt: now(), phase: "hidden", finders: [] });
}
