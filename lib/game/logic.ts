// Règles du jeu, sans accès à la base : testables telles quelles.
import type { Game, Round } from "../types";

export function nameKey(name: string) {
  return name.trim().normalize("NFC").toLocaleLowerCase("fr");
}

export function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 40);
}

/** Fisher–Yates avec un vrai aléa (fini l'ordre alphabétique). */
export function shuffle<T>(items: T[], random: () => number = cryptoRandom): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cryptoRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/** Pioche : mots jamais vus d'abord (mélangés), puis ceux des parties récentes (mélangés aussi). */
export function buildDeck(eligible: string[], recentlyPlayed: Set<string>, random?: () => number) {
  const fresh = eligible.filter((id) => !recentlyPlayed.has(id));
  const seen = eligible.filter((id) => recentlyPlayed.has(id));
  return [...shuffle(fresh, random), ...shuffle(seen, random)];
}

/** Rotation stricte : tour 1 = siège 0, tour 2 = siège 1, … */
export function readerFor(game: Pick<Game, "seats" | "roundNumber">) {
  return game.seats[(game.roundNumber - 1) % game.seats.length];
}

export type ScoreLine = { name: string; score: number; rank: number };

/** Classement : +1 par mot trouvé ; ex æquo = même rang. */
export function scoreboard(seats: string[], rounds: Pick<Round, "finders">[]): ScoreLine[] {
  const score = new Map(seats.map((s) => [s, 0]));
  for (const r of rounds) for (const f of r.finders) score.set(f, (score.get(f) ?? 0) + 1);
  const sorted = seats
    .map((name, seat) => ({ name, seat, score: score.get(name) ?? 0 }))
    .sort((a, b) => b.score - a.score || a.seat - b.seat);
  let rank = 0;
  return sorted.map((line, i) => {
    if (i === 0 || line.score !== sorted[i - 1].score) rank = i + 1;
    return { name: line.name, score: line.score, rank };
  });
}

export function winners(lines: ScoreLine[]) {
  if (!lines.length || lines[0].score === 0) return [];
  return lines.filter((l) => l.rank === 1).map((l) => l.name);
}
