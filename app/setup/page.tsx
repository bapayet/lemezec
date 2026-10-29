"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { CircleAlert, Play, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { OfflineBanner } from "@/components/shell/AppProviders";
import { Button } from "@/components/ui/Button";
import { DifficultyTile } from "@/components/ui/DifficultyTile";
import { IconButton, SectionLabel, SelectedChip, SuggestionChip, TextField } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/lib/db";
import { cleanName, nameKey } from "@/lib/game/logic";
import { countByDifficulty, startGame } from "@/lib/game/store";
import { DIFFICULTIES, type Difficulty } from "@/lib/types";

const MAX_PLAYERS = 12;

// S07 Configuration de la partie
export default function SetupPage() {
  const router = useRouter();
  const toast = useToast();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [levels, setLevels] = useState<Difficulty[]>(["moyen", "difficile"]);
  const [starting, setStarting] = useState(false);

  const recent = useLiveQuery(() => db.players.orderBy("lastPlayedAt").reverse().limit(12).toArray(), [], []);
  const counts = useLiveQuery(countByDifficulty, [], undefined);
  const wordCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  // pré-cocher seulement des niveaux qui ont des mots
  useEffect(() => {
    if (counts) setLevels((l) => l.filter((d) => counts[d] > 0));
  }, [counts]);

  const taken = useMemo(() => new Set(players.map(nameKey)), [players]);
  const suggestions = recent.filter((p) => !taken.has(p.nameKey)).slice(0, 8);
  const available = counts ? levels.reduce((n, d) => n + counts[d], 0) : 0;

  function add(name: string) {
    const clean = cleanName(name);
    if (!clean) return;
    if (taken.has(nameKey(clean))) return setError(`${clean} est déjà à la table.`);
    if (players.length >= MAX_PLAYERS) return setError(`${MAX_PLAYERS} joueurs maximum.`);
    setPlayers((p) => [...p, clean]);
    setDraft("");
    setError(undefined);
  }

  function toggle(level: Difficulty) {
    setLevels((l) => (l.includes(level) ? l.filter((x) => x !== level) : [...l, level]));
  }

  // aucun mot du tout sur l'appareil : c'est la vraie raison, avant toute autre (BUG-002)
  const noWords = wordCount === 0;
  const blocker =
    noWords ? "Aucun mot sur cet appareil." :
    players.length < 2 ? "Il faut au moins deux joueurs." :
    !levels.length ? "Choisissez au moins un niveau." :
    counts && available === 0 ? "Aucun mot pour ces niveaux." : null;

  async function start() {
    setStarting(true);
    try {
      await startGame(players, levels);
      router.push("/game");
    } catch (e) {
      toast.show({ message: (e as Error).message, tone: "error" });
      setStarting(false);
    }
  }

  return (
    <>
      <PageHeader title="Nouvelle partie" back="/" size="back" />
      <OfflineBanner wordCount={wordCount} />
      <main id="contenu" className="mx-auto grid max-w-app gap-8 px-4 pb-36 pt-6">
        <section aria-labelledby="joueurs" className="grid gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="joueurs" className="text-lg text-text">Joueurs</h2>
            <span className="text-sm text-text-muted">{players.length} / {MAX_PLAYERS}</span>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); add(draft); inputRef.current?.focus(); }}
          >
            <label htmlFor="prenom" className="sr-only">Prénom du joueur</label>
            <TextField
              ref={inputRef}
              id="prenom"
              value={draft}
              maxLength={40}
              autoComplete="off"
              enterKeyHint="done"
              placeholder="Prénom du joueur"
              error={error}
              errorId={errorId}
              onChange={(e) => { setDraft(e.target.value); setError(undefined); }}
            />
            <IconButton type="submit" label="Ajouter le joueur" tone="accent" disabled={!draft.trim()}>
              <Plus aria-hidden className="size-6" />
            </IconButton>
          </form>
          {error && (
            <p id={errorId} className="flex items-center gap-1.5 text-sm text-danger">
              <CircleAlert aria-hidden className="size-4" /> {error}
            </p>
          )}

          {players.length > 0 && (
            <ul aria-label="Joueurs de la partie" className="flex flex-wrap gap-2">
              {players.map((p) => (
                <li key={p} className="max-w-full">
                  <SelectedChip name={p} onRemove={() => setPlayers((all) => all.filter((x) => x !== p))} />
                </li>
              ))}
            </ul>
          )}

          {suggestions.length > 0 && (
            <div className="grid gap-2">
              <SectionLabel as="h3">Ont déjà joué ici</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((p) => <SuggestionChip key={p.nameKey} name={p.name} onAdd={() => add(p.name)} />)}
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="niveaux" className="grid gap-3">
          <div>
            <h2 id="niveaux" className="text-lg text-text">Niveaux de mots</h2>
            <p className="text-sm text-text-muted">Cochez-en un ou plusieurs.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {DIFFICULTIES.map((d) => (
              <DifficultyTile key={d} level={d} pressed={levels.includes(d)} count={counts?.[d]} onToggle={() => toggle(d)} />
            ))}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
        <div className="mx-auto grid max-w-app gap-1.5">
          <Button variant="play" size="lg" icon={<Play aria-hidden className="size-6" />} disabled={!!blocker} loading={starting} onClick={start} aria-describedby="setup-blocker">
            C&apos;est parti
          </Button>
          <p id="setup-blocker" className="min-h-5 text-center text-sm text-text-muted">
            {blocker ?? `${available.toLocaleString("fr-FR")} mots dans la pioche`}
            {noWords && (
              <> <Link href="/settings" className="font-semibold text-accent underline underline-offset-2">Mettre à jour les mots</Link></>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
