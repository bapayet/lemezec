import "server-only";
import { createHash } from "node:crypto";
import Papa from "papaparse";
import type { Caller } from "@/lib/supabase/server";
import { check, type Candidate } from "@/lib/words/validate";
import type { Difficulty } from "@/lib/types";

export const MAX_ROWS = 5000;
export const MAX_BYTES = 2 * 1024 * 1024;

type Source = "wiktionary" | "sheet" | "manual" | "sample" | "legacy";
type Extra = { sourceUrl?: string; license?: "CC-BY-SA-4.0" | "own" };

export type Preview = {
  batchId: string;
  inserted: { id: string; word: string; definition: string; difficulty: Difficulty; labels: string[]; flags: string[] }[];
  duplicates: string[];
  rejected: { word: string; reason: string }[];
  notFound: string[];
};

// même id que scripts/build-seed.mjs et import-words.mjs : un mot = un id, quel que soit le chemin d'import
export function stableId(word: string) {
  const h = createHash("sha1").update(word.normalize("NFC").trim().toLowerCase()).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Crée un lot « preview » : les mots valides entrent en « pending », rien n'est visible des joueurs avant validation. */
export async function createPreview(
  c: Caller,
  source: Source,
  input: unknown,
  candidates: (Candidate & Extra)[],
  fallback: Difficulty,
  notFound: string[] = [],
): Promise<Preview> {
  const { data: batch, error: bErr } = await c.sb
    .from("import_batches")
    .insert({ source, input, created_by: c.userId })
    .select("id")
    .single();
  if (bErr) throw bErr;

  const rejected: Preview["rejected"] = [];
  const valid = new Map<string, ReturnType<typeof toRow>>();
  for (const cand of candidates) {
    const r = check(cand, fallback);
    if (!r.ok) { rejected.push({ word: r.word, reason: r.reason }); continue; }
    const row = toRow(r, cand, source, batch.id);
    valid.set(row.id, row); // doublons à l'intérieur du fichier : le dernier gagne
  }

  let inserted: Preview["inserted"] = [];
  if (valid.size) {
    const { data, error } = await c.sb
      .from("words")
      .upsert([...valid.values()], { onConflict: "word_key", ignoreDuplicates: true })
      .select("id, word, definition, difficulty, labels, review_flags");
    if (error) throw error;
    inserted = data.map((w) => ({ id: w.id, word: w.word, definition: w.definition, difficulty: w.difficulty, labels: w.labels, flags: w.review_flags }));
  }
  const insertedIds = new Set(inserted.map((w) => w.id));
  const duplicates = [...valid.values()].filter((w) => !insertedIds.has(w.id)).map((w) => w.word);

  const stats = { candidates: candidates.length, inserted: inserted.length, duplicates: duplicates.length, rejected: rejected.length, not_found: notFound.length };
  await c.sb.from("import_batches").update({ stats, errors: rejected.slice(0, 200) }).eq("id", batch.id);
  return { batchId: batch.id, inserted, duplicates, rejected, notFound };
}

function toRow(r: Extract<ReturnType<typeof check>, { ok: true }>, cand: Extra, source: Source, batchId: string) {
  return {
    id: stableId(r.word),
    word: r.word,
    definition: r.definition,
    difficulty: r.difficulty,
    labels: r.labels,
    review_flags: r.flags,
    status: "pending" as const,
    source,
    source_url: cand.sourceUrl ?? null,
    license: cand.license ?? null,
    import_batch_id: batchId,
  };
}

/** CSV avec en-têtes : word|mot, definition|définition, difficulty|difficulté (facultative), labels (facultative). */
export function parseWordCsv(text: string): { rows: Candidate[]; error?: string } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""),
  });
  const fields = res.meta.fields ?? [];
  const wordCol = fields.find((f) => f === "word" || f === "mot");
  const defCol = fields.find((f) => f === "definition");
  if (!wordCol || !defCol) return { rows: [], error: "Colonnes « mot » et « définition » introuvables dans la première ligne." };
  if (res.data.length > MAX_ROWS) return { rows: [], error: `Trop de lignes (${res.data.length}, ${MAX_ROWS} au maximum).` };
  const diffCol = fields.find((f) => f === "difficulty" || f === "difficulte");
  return {
    rows: res.data.map((r) => ({
      word: r[wordCol] ?? "",
      definition: r[defCol] ?? "",
      difficulty: diffCol ? r[diffCol] : undefined,
      labels: r.labels ? r.labels.split(/;\s*/).filter(Boolean) : undefined,
    })),
  };
}

/** Lien de partage Google Sheet -> URL d'export CSV. Seul docs.google.com est accepté (pas de requête vers une URL arbitraire). */
export function sheetExportUrl(link: string): string | null {
  let u: URL;
  try { u = new URL(link.trim()); } catch { return null; }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com") return null;
  const m = u.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (!m) return null;
  const gid = u.searchParams.get("gid") ?? u.hash.match(/gid=(\d+)/)?.[1] ?? "0";
  if (!/^\d+$/.test(gid)) return null;
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

/** Télécharge un texte en coupant au-delà de MAX_BYTES. */
export async function fetchCapped(url: string): Promise<{ text?: string; error?: string }> {
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), cache: "no-store" });
  // un Sheet privé renvoie vers la page de connexion Google (HTML)
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/csv")) {
    return { error: "Le Sheet n'est pas lisible : partagez-le en « Tous les utilisateurs disposant du lien » (lecteur)." };
  }
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); return { error: "Fichier trop gros (2 Mo au maximum)." }; }
    chunks.push(value);
  }
  return { text: new TextDecoder("utf-8").decode(Buffer.concat(chunks)) };
}
