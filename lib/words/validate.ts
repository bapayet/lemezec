// Règles communes à tous les imports (Wiktionnaire, Google Sheet, CSV).
// Même logique que replica/tools/nettoyer_mots.py, sans la réparation des espaces perdus.
import { DIFFICULTIES, type Difficulty } from "../types";

export type Candidate = { word: string; definition: string; difficulty?: string; labels?: string[] };
export type Checked =
  | { ok: true; word: string; definition: string; difficulty: Difficulty; labels: string[]; flags: string[] }
  | { ok: false; word: string; reason: string };

const LEADING_LABELS = /^\s*((?:\([^)]{1,40}\)\s*)+)/;
const INFLECTED = /^(Pluriel|Féminin|Masculin|Participe|Première|Deuxième|Troisième|.{0,30}personne du (singulier|pluriel))/i;
const VARIANT = /^(Variante|Autre orthographe)/i;
const EN = new Set("the of and to a in is that for it as with by an or be which are from this used".split(" "));
const FR = new Set("le la les de des du un une et en est qui que pour par dans sur au aux se ou avec ne pas".split(" "));

export const nfc = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ");

export function parseDifficulty(raw?: string): Difficulty | null {
  if (!raw) return null;
  // « Très difficile », « tres_difficile », « 4 »… -> tres_difficile
  const k = raw.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s-]+/g, "_");
  const alias: Record<string, Difficulty> = { facile: "simple", "1": "simple", "2": "moyen", "3": "difficile", "4": "tres_difficile" };
  if (alias[k]) return alias[k];
  return (DIFFICULTIES as readonly string[]).includes(k) ? (k as Difficulty) : null;
}

export function splitLabels(definition: string) {
  const m = definition.match(LEADING_LABELS);
  if (!m) return { labels: [] as string[], definition: definition.trim() };
  const labels = [...m[1].matchAll(/\(([^)]+)\)/g)].map((x) => x[1].trim());
  return { labels, definition: definition.slice(m[0].length).trim() };
}

export function looksEnglish(text: string) {
  const words = text.toLowerCase().match(/[a-zà-ÿ]+/g) ?? [];
  const en = words.filter((w) => EN.has(w)).length;
  const fr = words.filter((w) => FR.has(w)).length;
  return en >= 2 && en > fr;
}

export function check(c: Candidate, fallback: Difficulty): Checked {
  const word = nfc(c.word ?? "");
  if (!word) return { ok: false, word: c.word ?? "", reason: "mot vide" };
  if (word.length < 2 || word.length > 60) return { ok: false, word, reason: "longueur hors limites" };
  if (/^[-'’ ]|[-'’ ]$/.test(word)) return { ok: false, word, reason: "affixe, pas un mot" };
  if (/\d/.test(word)) return { ok: false, word, reason: "contient des chiffres" };
  if (word.length >= 2 && word === word.toUpperCase() && /[a-zà-ÿ]/i.test(word)) return { ok: false, word, reason: "sigle" };
  if (/^(d|l|qu)['’]/i.test(word)) return { ok: false, word, reason: "commence par une élision" };

  const split = splitLabels(nfc(c.definition ?? ""));
  const definition = split.definition.replace(/\s*\[\d+\]/g, "");
  if (definition.length < 3) return { ok: false, word, reason: "définition vide" };
  if (definition.length > 600) return { ok: false, word, reason: "définition trop longue (600 max)" };
  if (INFLECTED.test(definition)) return { ok: false, word, reason: "forme fléchie" };
  if (VARIANT.test(definition)) return { ok: false, word, reason: "variante, renvoie à un autre mot" };

  const flags: string[] = [];
  if (looksEnglish(definition)) flags.push("definition_anglaise");
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) flags.push("nom_propre");
  if (definition.length > 250) flags.push("definition_longue");
  const labels = [...new Set([...(c.labels ?? []), ...split.labels])].slice(0, 8);
  return { ok: true, word, definition, difficulty: parseDifficulty(c.difficulty) ?? fallback, labels, flags };
}
