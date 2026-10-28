export const DIFFICULTIES = ["simple", "moyen", "difficile", "tres_difficile"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const RATINGS = ["trop_facile", "bien", "complique", "impossible"] as const;
export type Rating = (typeof RATINGS)[number];

export type Word = {
  id: string;
  word: string;
  definition: string;
  labels: string[];
  difficulty: Difficulty;
  difficultyComputed: Difficulty | null;
  status: "active" | "hidden";
  updatedAt: string;
};

export type Player = {
  nameKey: string; // minuscules + NFC : « Baptiste » et « baptiste » sont le même joueur
  name: string;
  lastPlayedAt: string;
};

export type GamePhase = "hidden" | "revealed";

export type Game = {
  id: string;
  status: "in_progress" | "finished";
  startedAt: string;
  endedAt: string | null;
  difficulties: Difficulty[];
  seats: string[];
  deck: string[]; // ids de mots, mélangés au lancement et figés
  cursor: number; // position du mot courant dans deck
  roundNumber: number; // numéro du tour en cours (1, 2, …)
  phase: GamePhase;
  finders: string[]; // sélection en cours, avant validation du tour
};

export type Round = {
  id: string;
  gameId: string;
  number: number;
  wordId: string;
  reader: string;
  finders: string[];
  rating: Rating | null;
  createdAt: string;
};

export type OutboxItem =
  | { id: string; kind: "rating"; createdAt: string; payload: { id: string; wordId: string; rating: Rating; found: boolean; ratedAt: string } }
  | { id: string; kind: "report"; createdAt: string; payload: { wordId: string; reason: "other" } };

export type SyncCursor = { updatedAt: string; id: string };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  simple: "Simple",
  moyen: "Moyen",
  difficile: "Difficile",
  tres_difficile: "Très difficile",
};

export const RATING_LABEL: Record<Rating, string> = {
  trop_facile: "Trop facile",
  bien: "Bien dosé",
  complique: "Corsé",
  impossible: "Introuvable",
};

export function effectiveDifficulty(w: Pick<Word, "difficulty" | "difficultyComputed">): Difficulty {
  return w.difficultyComputed ?? w.difficulty;
}
