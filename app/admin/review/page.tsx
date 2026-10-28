"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, Flag, Save, Search } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { AdminGate } from "@/components/admin/AdminGate";
import { api, useAdmin } from "@/components/admin/useAdmin";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton, TextField } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from "@/lib/types";

type AdminWord = { id: string; word: string; definition: string; labels: string[]; difficulty: Difficulty; status: string; review_flags: string[]; source_url: string | null };
type Group = { word: { id: string; word: string; definition: string; status: string }; reportIds: string[]; reasons: Record<string, number> };
type Tab = "pending" | "reports" | "active" | "hidden";

const FLAG_LABEL: Record<string, string> = {
  mot_courant: "mot courant", nom_propre: "nom propre", collage_possible: "espaces à vérifier", sensible: "sensible",
  definition_longue: "définition longue", exposant_reconstruit: "exposant à vérifier", definition_anglaise: "définition en anglais",
};
const REASON_LABEL: Record<string, string> = {
  other: "retiré en partie", not_a_word: "pas un mot", not_french_definition: "définition pas en français", wrong_definition: "définition fausse", offensive: "choquant",
};
const tabs: { id: Tab; label: string }[] = [
  { id: "pending", label: "À relire" }, { id: "reports", label: "Signalés" }, { id: "active", label: "En jeu" }, { id: "hidden", label: "Masqués" },
];

function ReviewRow({ w, onDone }: { w: AdminWord; onDone: (id: string) => void }) {
  const toast = useToast();
  const [definition, setDefinition] = useState(w.definition);
  const [difficulty, setDifficulty] = useState<Difficulty>(w.difficulty);
  const [busy, setBusy] = useState(false);
  const dirty = definition !== w.definition || difficulty !== w.difficulty;

  async function save(status?: "active" | "hidden") {
    setBusy(true);
    try {
      await api(`/api/admin/words/${w.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(definition !== w.definition && { definition }), ...(difficulty !== w.difficulty && { difficulty }), ...(status && { status }) }),
      });
      if (status && status !== w.status) onDone(w.id);
      else toast.show({ message: "Enregistré." });
    } catch (e) {
      toast.show({ message: (e as Error).message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="grid gap-2.5 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 lang="fr" className="text-lg text-text">{w.word}</h3>
        {w.source_url && <a href={w.source_url} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-accent underline">source</a>}
      </div>
      {w.review_flags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="À vérifier">
          {w.review_flags.map((f) => (
            <li key={f} className="rounded-pill bg-danger-soft px-2 py-0.5 text-xs font-semibold text-on-danger-soft">{FLAG_LABEL[f.split(":")[0]] ?? f}</li>
          ))}
        </ul>
      )}
      <label className="sr-only" htmlFor={`def-${w.id}`}>Définition de {w.word}</label>
      <textarea
        id={`def-${w.id}`}
        lang="fr"
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        rows={Math.min(6, Math.ceil(definition.length / 45) + 1)}
        maxLength={600}
        className="w-full rounded-md border border-border-input bg-surface px-3 py-2 text-base text-text focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`niv-${w.id}`}>Niveau</label>
        <select id={`niv-${w.id}`} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="h-10 rounded-md border border-border-input bg-surface px-2 text-sm text-text">
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          {dirty && w.status !== "pending" && (
            <Button size="sm" variant="secondary" loading={busy} icon={<Save aria-hidden className="size-4" />} onClick={() => save()}>Enregistrer</Button>
          )}
          {w.status !== "hidden" && (
            <Button size="sm" variant="dangerGhost" disabled={busy} icon={<EyeOff aria-hidden className="size-4" />} onClick={() => save("hidden")}>Masquer</Button>
          )}
          {w.status !== "active" && (
            <Button size="sm" variant="primary" loading={busy} icon={<Check aria-hidden className="size-4" />} onClick={() => save("active")}>Mettre en jeu</Button>
          )}
        </div>
      </div>
    </li>
  );
}

function Words({ status }: { status: Exclude<Tab, "reports"> }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ words: AdminWord[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setError(undefined);
    try {
      const params = new URLSearchParams({ status, page: String(page), ...(q.trim() && { q: q.trim() }) });
      setData(await api(`/api/admin/words?${params}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [status, page, q]);

  useEffect(() => {
    const t = setTimeout(load, 250); // attend la fin de la frappe
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-subtle" />
        <label htmlFor="cherche" className="sr-only">Chercher un mot</label>
        <TextField id="cherche" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Chercher un mot" className="pl-10" />
      </div>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : !data ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)
      ) : data.words.length === 0 ? (
        <EmptyState icon={<Check />} title={status === "pending" ? "Rien à relire" : "Aucun mot"}>{q ? "Aucun résultat pour cette recherche." : undefined}</EmptyState>
      ) : (
        <>
          <p className="text-sm text-text-muted">{data.total.toLocaleString("fr-FR")} mot{data.total > 1 ? "s" : ""}</p>
          <ul className="grid gap-3">
            {data.words.map((w) => (
              <ReviewRow key={w.id} w={w} onDone={(id) => setData((d) => d && { ...d, total: d.total - 1, words: d.words.filter((x) => x.id !== id) })} />
            ))}
          </ul>
          <nav aria-label="Pages" className="flex items-center justify-between">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédents</Button>
            <span className="text-sm text-text-muted">Page {page + 1} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
            <Button size="sm" variant="secondary" disabled={(page + 1) * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Suivants</Button>
          </nav>
        </>
      )}
    </div>
  );
}

function Reports() {
  const toast = useToast();
  const [groups, setGroups] = useState<Group[] | null>(null);
  useEffect(() => { api<{ groups: Group[] }>("/api/admin/reports").then((r) => setGroups(r.groups)).catch((e) => toast.show({ message: e.message, tone: "error" })); }, [toast]);

  async function act(g: Group, hide: boolean) {
    try {
      if (hide) await api(`/api/admin/words/${g.word.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "hidden" }) });
      await api(`/api/admin/reports/${g.word.id}?word=1`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ resolved: true }) });
      setGroups((all) => all?.filter((x) => x.word.id !== g.word.id) ?? null);
    } catch (e) {
      toast.show({ message: (e as Error).message, tone: "error" });
    }
  }

  if (!groups) return <Skeleton className="h-40 rounded-lg" />;
  if (!groups.length) return <EmptyState icon={<Flag />} title="Aucun signalement">Les mots retirés pendant les parties apparaîtront ici.</EmptyState>;
  return (
    <ul className="grid gap-3">
      {groups.map((g) => (
        <li key={g.word.id} className="grid gap-2 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 lang="fr" className="text-lg text-text">{g.word.word}</h3>
            <span className="shrink-0 text-sm font-semibold text-on-danger-soft">{g.reportIds.length} signalement{g.reportIds.length > 1 ? "s" : ""}</span>
          </div>
          <p lang="fr" className="text-sm text-text-muted">{g.word.definition}</p>
          <p className="text-xs text-text-subtle">{Object.entries(g.reasons).map(([r, n]) => `${REASON_LABEL[r] ?? r} ×${n}`).join(" · ")}</p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => act(g, false)}>Garder le mot</Button>
            <Button size="sm" variant="danger" icon={<EyeOff aria-hidden className="size-4" />} onClick={() => act(g, true)}>Masquer</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// S14 Relecture : mots en attente (import, nettoyage), signalements, recherche
export default function AdminReviewPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const a = useAdmin();
  return (
    <>
      <PageHeader title="Relecture" back="/admin/login" size="back" />
      <main id="contenu" className="mx-auto grid max-w-app gap-4 px-4 pb-16 pt-4">
        <AdminGate>
          <div role="tablist" aria-label="Filtre" className="grid grid-cols-4 gap-1 rounded-lg bg-surface-muted p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("h-10 rounded-md text-sm font-semibold", tab === t.id ? "bg-surface text-accent shadow-card" : "text-text-muted hover:text-text")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label}>
            {a.admin && (tab === "reports" ? <Reports /> : <Words key={tab} status={tab} />)}
          </div>
        </AdminGate>
      </main>
    </>
  );
}
