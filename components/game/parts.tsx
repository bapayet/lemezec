"use client";
import { Ban, Check, CircleAlert, Crown, Eye, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ScoreLine } from "@/lib/game/logic";
import { RATING_LABEL, RATINGS, type Rating, type Word } from "@/lib/types";

export function WordCard({ word, revealed, onReveal }: { word: Word; revealed: boolean; onReveal: () => void }) {
  const long = word.word.length > 14;
  return (
    <section aria-labelledby="mot" className="grid gap-3 rounded-xl bg-surface p-5 text-center text-text">
      <p className="text-sm text-text-subtle">Le mot</p>
      <h2 id="mot" lang="fr" className={cn("hyphens-auto break-words", long ? "text-2xl" : "text-word")}>
        {word.word}
      </h2>
      <div aria-live="polite">
        {revealed ? (
          <div className="grid gap-2 rounded-md bg-surface-muted px-4 py-3.5 text-left">
            {word.labels.length > 0 && (
              <ul aria-label="Usage" className="flex flex-wrap gap-1.5">
                {word.labels.slice(0, 4).map((l) => (
                  <li key={l} className="rounded-pill bg-surface px-2 py-0.5 text-xs font-semibold text-text-muted">{l}</li>
                ))}
              </ul>
            )}
            <p lang="fr" className="text-base">{word.definition}</p>
            {/* text-subtle sur surface-muted = 4,3:1 (BUG-003) */}
            <p className="text-xs text-text-muted">Définition : Wiktionnaire, CC BY-SA</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onReveal}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent-soft text-lg text-on-accent-soft hover:bg-surface-muted"
          >
            <Eye aria-hidden className="size-5" /> Voir la définition
          </button>
        )}
      </div>
    </section>
  );
}

export function FinderList({
  seats, reader, finders, onToggle,
}: { seats: string[]; reader: string; finders: string[]; onToggle: (name: string) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-lg text-on-gradient">Qui a trouvé ?</legend>
      {seats.filter((s) => s !== reader).map((name) => {
        const on = finders.includes(name);
        return (
          <button
            key={name}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(name)}
            className={cn(
              "flex h-14 items-center gap-3 rounded-lg px-4 text-left text-base font-semibold transition-colors duration-fast",
              on ? "bg-play-to text-on-play" : "bg-surface text-text hover:bg-accent-soft",
            )}
          >
            <span
              aria-hidden
              className={cn("grid size-6 shrink-0 place-items-center rounded-sm border-2", on ? "border-on-play" : "border-border-input")}
            >
              {on && <Check className="size-4" />}
            </span>
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {on && <span className="text-sm">+1</span>}
          </button>
        );
      })}
      <p className="rounded-lg bg-overlay-on-gradient px-4 py-2.5 text-sm text-on-gradient-muted">
        {reader} lit le mot : pas de point pour le lecteur.
      </p>
    </fieldset>
  );
}

const rateStyle: Record<Rating, { cls: string; icon: ReactNode }> = {
  trop_facile: { cls: "bg-rate-easy", icon: <ThumbsUp aria-hidden className="size-6" /> },
  bien: { cls: "bg-rate-good", icon: <ThumbsUp aria-hidden className="size-6" /> },
  complique: { cls: "bg-rate-hard", icon: <CircleAlert aria-hidden className="size-6" /> },
  impossible: { cls: "bg-rate-impossible", icon: <Ban aria-hidden className="size-6" /> },
};

export function RatingGrid({ onRate, onSkip, busy }: { onRate: (r: Rating) => void; onSkip: () => void; busy?: boolean }) {
  return (
    <div className="grid gap-3">
      <div role="group" aria-labelledby="noter" className="grid gap-2">
        <h2 id="noter" className="text-lg text-on-gradient">Ce mot était…</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy}
              onClick={() => onRate(r)}
              className={cn("grid h-18 place-items-center content-center gap-1 rounded-lg text-sm font-semibold text-on-rate hover:brightness-95 disabled:opacity-60", rateStyle[r].cls)}
            >
              {rateStyle[r].icon}
              {RATING_LABEL[r]}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onSkip}
        className="h-12 rounded-lg bg-overlay-on-gradient text-base font-semibold text-on-gradient hover:brightness-110"
      >
        Mot suivant, sans noter
      </button>
    </div>
  );
}

export function ScoreBoard({ lines, variant = "live" }: { lines: ScoreLine[]; variant?: "live" | "surface" }) {
  return (
    <ol className="grid gap-2" aria-label="Classement">
      {lines.map((l) => (
        <li
          key={l.name}
          className={cn(
            "flex h-11 items-center gap-2.5 rounded-md px-3.5 font-semibold",
            variant === "live" ? "bg-overlay-on-gradient text-on-gradient" : "border border-border bg-surface text-text",
          )}
        >
          <span className="w-8 shrink-0 text-sm">{l.rank}<sup>{l.rank === 1 ? "er" : "e"}</sup></span>
          {l.rank === 1 && l.score > 0 && <Crown aria-label="en tête" className="size-5 shrink-0" />}
          <span className="min-w-0 flex-1 truncate">{l.name}</span>
          <span className="text-lg">{l.score}</span>
        </li>
      ))}
    </ol>
  );
}
