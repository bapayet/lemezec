"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Crown, Minus } from "lucide-react";
import { ScoreBoard } from "./parts";
import { Skeleton } from "@/components/ui/misc";
import { difficultyDot } from "@/components/ui/DifficultyTile";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { scoreboard, winners } from "@/lib/game/logic";
import { DIFFICULTY_LABEL, RATING_LABEL, type Game } from "@/lib/types";

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function joinNames(names: string[]) {
  return new Intl.ListFormat("fr", { style: "long", type: "conjunction" }).format(names);
}

export function durationLabel(game: Game) {
  if (!game.endedAt) return null;
  const min = Math.max(1, Math.round((Date.parse(game.endedAt) - Date.parse(game.startedAt)) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

/** Résultat d'une partie : gagnant, classement, mots joués. Utilisé par S11 (fin de partie) et S12 (historique). */
export function GameSummary({ game }: { game: Game }) {
  const rounds = useLiveQuery(() => db.rounds.where("gameId").equals(game.id).sortBy("number"), [game.id]);
  const words = useLiveQuery(async () => {
    const ids = (rounds ?? []).map((r) => r.wordId);
    const list = await db.words.bulkGet(ids);
    return new Map(list.filter(Boolean).map((w) => [w!.id, w!]));
  }, [rounds]);

  if (!rounds || !words) return <Skeleton className="h-64 rounded-xl" />;

  const lines = scoreboard(game.seats, rounds);
  const top = winners(lines);
  const found = rounds.filter((r) => r.finders.length > 0).length;

  return (
    <div className="grid gap-6">
      <section aria-labelledby="gagnant" className="grid justify-items-center gap-2 rounded-xl bg-surface p-6 text-center text-text shadow-card">
        <Crown aria-hidden className="size-10 text-warning" />
        <h2 id="gagnant" className="text-2xl">
          {top.length === 0 ? "Personne n'a marqué" : top.length === 1 ? `${top[0]} gagne !` : `Égalité : ${joinNames(top)}`}
        </h2>
        <p className="text-sm text-text-muted">
          {rounds.length} mot{rounds.length > 1 ? "s" : ""} joué{rounds.length > 1 ? "s" : ""} · {found} trouvé{found > 1 ? "s" : ""}
          {durationLabel(game) ? ` · ${durationLabel(game)}` : ""}
        </p>
        <ul aria-label="Niveaux" className="flex flex-wrap justify-center gap-1.5">
          {game.difficulties.map((d) => (
            <li key={d} className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text-muted">
              <span aria-hidden className={cn("size-2.5 rounded-pill", difficultyDot[d])} /> {DIFFICULTY_LABEL[d]}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="classement" className="grid gap-2">
        <h2 id="classement" className="text-lg text-text">Classement</h2>
        <ScoreBoard lines={lines} variant="surface" />
      </section>

      <section aria-labelledby="mots" className="grid gap-2">
        <h2 id="mots" className="text-lg text-text">Les mots de la partie</h2>
        {rounds.length === 0 ? (
          <p className="text-sm text-text-muted">Aucun mot n&apos;a été joué.</p>
        ) : (
          <ol className="grid gap-2">
            {rounds.map((r) => {
              const w = words.get(r.wordId);
              return (
                <li key={r.id} className="grid gap-1 rounded-lg border border-border bg-surface px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span lang="fr" className="min-w-0 truncate text-base font-bold text-text">{w?.word ?? "mot retiré"}</span>
                    {r.rating && <span className="shrink-0 text-xs text-text-subtle">{RATING_LABEL[r.rating]}</span>}
                  </div>
                  {w && <p lang="fr" className="text-sm text-text-muted">{w.definition}</p>}
                  <p className="flex items-center gap-1.5 text-sm text-text-muted">
                    {r.finders.length ? <Check aria-hidden className="size-4 text-success" /> : <Minus aria-hidden className="size-4" />}
                    {r.finders.length ? `Trouvé par ${r.finders.join(", ")}` : "Personne n'a trouvé"} · lu par {r.reader}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
