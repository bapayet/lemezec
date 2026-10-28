import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/types";

export const difficultyDot: Record<Difficulty, string> = {
  simple: "bg-diff-simple",
  moyen: "bg-diff-moyen",
  difficile: "bg-diff-difficile",
  tres_difficile: "bg-diff-tres",
};

export function DifficultyTile({
  level, pressed, count, onToggle,
}: { level: Difficulty; pressed: boolean; count?: number; onToggle: () => void }) {
  const empty = count === 0;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={empty}
      onClick={onToggle}
      className={cn(
        "relative grid h-24 place-items-center content-center gap-1 rounded-lg border p-3 text-sm font-semibold text-text",
        "transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50",
        pressed ? "border-2 border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent",
      )}
    >
      <span aria-hidden className={cn("size-7 rounded-pill", difficultyDot[level])} />
      {DIFFICULTY_LABEL[level]}
      <span className="text-xs font-medium text-text-subtle">
        {count === undefined ? " " : count === 0 ? "aucun mot" : `${count.toLocaleString("fr-FR")} mots`}
      </span>
      {pressed && <Check aria-hidden className="absolute right-2 top-2 size-5 text-accent" />}
    </button>
  );
}
