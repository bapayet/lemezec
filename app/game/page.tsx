"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { EyeOff, Flag, Settings2 } from "lucide-react";
import { FinderList, RatingGrid, ScoreBoard, WordCard } from "@/components/game/parts";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/lib/db";
import { readerFor, scoreboard } from "@/lib/game/logic";
import { completeRound, currentGame, endGame, removeCurrentWord, reveal, toggleFinder, undoRemoveWord } from "@/lib/game/store";
import type { Rating } from "@/lib/types";

// S08–S10 Partie en cours : mot caché, définition + qui a trouvé + évaluation
export default function GamePage() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const finishing = useRef(false);

  const game = useLiveQuery(currentGame, [], null);
  const wordId = game ? game.deck[game.cursor] : undefined;
  const word = useLiveQuery(() => (wordId ? db.words.get(wordId) : undefined), [wordId]);
  const rounds = useLiveQuery(() => (game ? db.rounds.where("gameId").equals(game.id).toArray() : []), [game?.id], []);

  // nouveau mot : on remonte en haut pour que le lecteur et le mot soient visibles
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [game?.cursor]);

  // aucune partie en cours (terminée ailleurs, ou URL ouverte directement)
  useEffect(() => {
    if (game === undefined && !finishing.current) router.replace("/setup");
  }, [game, router]);

  if (game === null || game === undefined) {
    return (
      <div className="min-h-dvh bg-app-gradient p-4">
        <div className="mx-auto grid max-w-app gap-4 pt-16">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  const reader = readerFor(game);
  const lines = scoreboard(game.seats, rounds);
  const deckEmpty = game.cursor >= game.deck.length;

  async function finish() {
    finishing.current = true;
    await endGame(game!.id);
    router.replace(`/game/results?id=${game!.id}`);
  }

  async function next(rating: Rating | null) {
    setBusy(true);
    try { await completeRound(game!, rating); } finally { setBusy(false); }
  }

  async function removeWord() {
    const removed = await removeCurrentWord(game!);
    toast.show({ message: "Mot retiré de vos parties.", action: { label: "Annuler", run: () => void undoRemoveWord(game!.id, removed) } });
  }

  return (
    <div className="on-gradient min-h-dvh bg-app-gradient text-on-gradient">
      <header className="mx-auto flex max-w-app items-center justify-between px-4 pb-2 pt-4">
        <p className="text-xl">Tour {game.roundNumber}</p>
        <ConfirmDialog
          trigger={<Button variant="secondary" size="sm" icon={<Flag aria-hidden className="size-4" />}>Terminer</Button>}
          title="Arrêter la partie ?"
          description="Le classement final sera gardé dans l'historique."
          confirmLabel="Arrêter"
          cancelLabel="Continuer"
          onConfirm={finish}
        />
      </header>

      <main id="contenu" className="mx-auto grid max-w-app gap-4 px-4 pb-10 pt-2">
        {deckEmpty ? (
          <div className="rounded-xl bg-surface text-text">
            <EmptyState
              icon={<Settings2 />}
              title="La pioche est vide"
              action={<Button onClick={finish}>Voir les résultats</Button>}
            >
              Tous les mots de ces niveaux sont passés. Terminez la partie, puis relancez-en une avec d&apos;autres niveaux.
            </EmptyState>
          </div>
        ) : !word ? (
          <Skeleton className="h-56 rounded-xl" />
        ) : (
          <>
            <div className="grid gap-1 rounded-xl bg-surface px-5 py-4 text-center text-text" aria-live="polite">
              <p className="text-sm text-text-subtle">Lecteur</p>
              <p className="truncate text-xl text-accent">{reader}</p>
            </div>

            <WordCard word={word} revealed={game.phase === "revealed"} onReveal={() => reveal(game.id)} />

            {game.phase === "revealed" && (
              <>
                <FinderList seats={game.seats} reader={reader} finders={game.finders} onToggle={(n) => toggleFinder(game, n)} />
                <RatingGrid busy={busy} onRate={(r) => next(r)} onSkip={() => next(null)} />
              </>
            )}

            <Button variant="muted" size="md" block icon={<EyeOff aria-hidden className="size-5" />} onClick={removeWord}>
              Retirer ce mot de la pioche
            </Button>
          </>
        )}

        <section aria-labelledby="scores" className="mt-2 grid gap-2">
          <h2 id="scores" className="text-lg">Scores</h2>
          <ScoreBoard lines={lines} />
        </section>
      </main>
    </div>
  );
}
