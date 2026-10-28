"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, Check, FileSpreadsheet, FileUp } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { AdminGate } from "@/components/admin/AdminGate";
import { api } from "@/components/admin/useAdmin";
import { Button } from "@/components/ui/Button";
import { SectionLabel, TextField } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from "@/lib/types";

type Source = "wiktionary" | "sheet" | "csv";
type Preview = {
  batchId: string;
  inserted: { id: string; word: string; definition: string; difficulty: Difficulty; labels: string[]; flags: string[] }[];
  duplicates: string[];
  rejected: { word: string; reason: string }[];
  notFound: string[];
};

const sources: { id: Source; label: string; hint: string; icon: typeof BookOpen }[] = [
  { id: "wiktionary", label: "Wiktionnaire", hint: "liste de mots", icon: BookOpen },
  { id: "sheet", label: "Google Sheet", hint: "lien partagé", icon: FileSpreadsheet },
  { id: "csv", label: "Fichier CSV", hint: "2 Mo max", icon: FileUp },
];

// S06 Import de mots : aperçu (mots en attente) puis validation de ceux qu'on coche
export default function AdminImportPage() {
  const toast = useToast();
  const [source, setSource] = useState<Source>("wiktionary");
  const [difficulty, setDifficulty] = useState<Difficulty>("difficile");
  const [list, setList] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [keep, setKeep] = useState<Set<string>>(new Set());

  const words = list.split(/[,\n;]/).map((w) => w.trim()).filter(Boolean);

  async function run() {
    setBusy(true);
    try {
      let p: Preview;
      if (source === "wiktionary") {
        p = await api<Preview>("/api/admin/import/wiktionary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ words, difficulty }) });
      } else if (source === "sheet") {
        p = await api<Preview>("/api/admin/import/sheet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, difficulty }) });
      } else {
        const form = new FormData();
        form.set("file", file!);
        form.set("difficulty", difficulty);
        p = await api<Preview>("/api/admin/import/csv", { method: "POST", body: form });
      }
      setPreview(p);
      // les mots sans drapeau sont cochés d'office
      setKeep(new Set(p.inserted.filter((w) => w.flags.length === 0).map((w) => w.id)));
    } catch (e) {
      toast.show({ message: (e as Error).message, tone: "error" }, 8000);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await api<{ activated: number }>(`/api/admin/import/${preview.batchId}/commit`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wordIds: [...keep] }),
      });
      const left = preview.inserted.length - r.activated;
      toast.show({ message: `${r.activated} mot${r.activated > 1 ? "s" : ""} en jeu${left ? `, ${left} en relecture` : ""}.` });
      setPreview(null); setList(""); setUrl(""); setFile(null);
    } catch (e) {
      toast.show({ message: (e as Error).message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const ready = source === "wiktionary" ? words.length > 0 && words.length <= 50 : source === "sheet" ? url.startsWith("https://docs.google.com/") : !!file;

  return (
    <>
      <PageHeader title="Importer des mots" back="/admin/login" size="back" />
      <main id="contenu" className="mx-auto grid max-w-app gap-6 px-4 pb-16 pt-6">
        <AdminGate>
          {!preview ? (
            <div className="grid gap-6">
              <section className="grid gap-2">
                <SectionLabel>Source</SectionLabel>
                <div role="radiogroup" aria-label="Source" className="grid grid-cols-3 gap-2">
                  {sources.map(({ id, label, hint, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={source === id}
                      onClick={() => setSource(id)}
                      className={cn(
                        "grid justify-items-center gap-1 rounded-lg border p-3 text-sm font-semibold",
                        source === id ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-text hover:border-accent",
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                      {label}
                      <span className={cn("text-xs font-medium", source === id ? "text-on-accent" : "text-text-subtle")}>{hint}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-2">
                {source === "wiktionary" && (
                  <>
                    <label htmlFor="liste" className="text-sm font-semibold text-text">Mots à chercher (virgules ou retours à la ligne, 50 max)</label>
                    <textarea
                      id="liste"
                      value={list}
                      onChange={(e) => setList(e.target.value)}
                      rows={5}
                      placeholder="bibliopole, psithurisme, nycthémère"
                      className="min-h-30 w-full rounded-md border border-border-input bg-surface px-3.5 py-3 text-base text-text placeholder:text-text-subtle focus:border-accent"
                    />
                    <p className={cn("text-sm", words.length > 50 ? "text-danger" : "text-text-muted")}>{words.length} mot{words.length > 1 ? "s" : ""}</p>
                  </>
                )}
                {source === "sheet" && (
                  <>
                    <label htmlFor="url" className="text-sm font-semibold text-text">Lien du Google Sheet</label>
                    <TextField id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" />
                    <p className="text-sm text-text-muted">
                      Première ligne : <b>mot</b>, <b>définition</b>, et si vous voulez <b>difficulté</b>. Partage : « Tous les utilisateurs disposant du lien », en lecture.
                    </p>
                  </>
                )}
                {source === "csv" && (
                  <>
                    <label htmlFor="fichier" className="text-sm font-semibold text-text">Fichier CSV (UTF-8)</label>
                    <input
                      id="fichier"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="text-sm text-text file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-accent-soft file:px-4 file:font-semibold file:text-on-accent-soft"
                    />
                    <p className="text-sm text-text-muted">Mêmes colonnes que pour un Sheet. Le fichier mots_nettoyes.csv est accepté tel quel.</p>
                  </>
                )}
              </section>

              <section className="grid gap-2">
                <label htmlFor="niveau" className="text-sm font-semibold text-text">Niveau si le fichier n&apos;en donne pas</label>
                <select
                  id="niveau"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="h-12 rounded-md border border-border-input bg-surface px-3 text-base text-text"
                >
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
                </select>
              </section>

              <Button onClick={run} loading={busy} disabled={!ready} block>Voir l&apos;aperçu</Button>
              <p className="text-xs text-text-muted">
                Rien n&apos;est visible des joueurs avant validation. Définitions du Wiktionnaire : licence CC BY-SA 4.0, la source est conservée.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              <p className="text-base text-text">
                <b>{preview.inserted.length}</b> nouveau{preview.inserted.length > 1 ? "x" : ""} · {preview.duplicates.length} déjà en base ·{" "}
                {preview.rejected.length} refusé{preview.rejected.length > 1 ? "s" : ""}
                {preview.notFound.length ? ` · ${preview.notFound.length} introuvable${preview.notFound.length > 1 ? "s" : ""}` : ""}
              </p>

              {preview.inserted.length > 0 && (
                <section className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <SectionLabel>À mettre en jeu ({keep.size})</SectionLabel>
                    <button type="button" className="text-sm font-semibold text-accent" onClick={() => setKeep(keep.size === preview.inserted.length ? new Set() : new Set(preview.inserted.map((w) => w.id)))}>
                      {keep.size === preview.inserted.length ? "Tout décocher" : "Tout cocher"}
                    </button>
                  </div>
                  <ul className="grid gap-2">
                    {preview.inserted.map((w) => {
                      const on = keep.has(w.id);
                      return (
                        <li key={w.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => { const n = new Set(keep); if (on) n.delete(w.id); else n.add(w.id); setKeep(n); }}
                            className={cn("flex w-full gap-3 rounded-lg border p-3 text-left", on ? "border-accent bg-accent-soft" : "border-border bg-surface")}
                          >
                            <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm border-2", on ? "border-accent bg-accent text-on-accent" : "border-border-input")}>
                              {on && <Check className="size-4" />}
                            </span>
                            <span className="grid min-w-0 gap-0.5">
                              <span className="font-bold text-text" lang="fr">{w.word} <span className="text-xs font-medium text-text-muted">· {DIFFICULTY_LABEL[w.difficulty]}</span></span>
                              <span className="text-sm text-text-muted" lang="fr">{w.definition}</span>
                              {w.flags.length > 0 && <span className="text-xs font-semibold text-warning">À vérifier : {w.flags.join(", ").replaceAll("_", " ")}</span>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {(preview.rejected.length > 0 || preview.notFound.length > 0 || preview.duplicates.length > 0) && (
                <details className="rounded-lg border border-border bg-surface p-3 text-sm text-text-muted">
                  <summary className="cursor-pointer font-semibold text-text">Écartés</summary>
                  <ul className="mt-2 grid gap-1">
                    {preview.notFound.map((w) => <li key={`nf-${w}`}>{w} : introuvable sur le Wiktionnaire</li>)}
                    {preview.duplicates.map((w) => <li key={`d-${w}`}>{w} : déjà en base</li>)}
                    {preview.rejected.slice(0, 100).map((r, i) => <li key={`r-${i}`}>{r.word || "(vide)"} : {r.reason}</li>)}
                  </ul>
                </details>
              )}

              <div className="grid gap-2">
                <Button variant="play" size="lg" onClick={commit} loading={busy} disabled={preview.inserted.length === 0}>
                  Mettre {keep.size} mot{keep.size > 1 ? "s" : ""} en jeu
                </Button>
                <p className="text-center text-xs text-text-muted">
                  Les mots non cochés restent en attente dans la <Link href="/admin/review" className="font-semibold text-accent underline">relecture</Link>.
                </p>
              </div>
            </div>
          )}
        </AdminGate>
      </main>
    </>
  );
}
