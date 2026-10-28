"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { House, RotateCcw, SearchX } from "lucide-react";
import { GameSummary } from "@/components/game/GameSummary";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { startGame } from "@/lib/game/store";

// S11 Fin de partie (nouvel écran : l'original plantait à cet endroit)
function Results() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const game = useLiveQuery(() => (id ? db.games.get(id) : undefined), [id], null);

  async function replay() {
    if (!game) return;
    await startGame(game.seats, game.difficulties);
    router.push("/game");
  }

  return (
    <>
      <header className="bg-app-gradient px-4 pb-6 pt-12 text-on-gradient">
        <h1 className="mx-auto max-w-app text-2xl">Fin de partie</h1>
      </header>
      <main id="contenu" className="mx-auto grid max-w-app gap-6 px-4 pb-12 pt-6">
        {game === null ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : !game ? (
          <EmptyState icon={<SearchX />} title="Partie introuvable" action={<Link href="/history" className="text-accent underline">Voir l&apos;historique</Link>}>
            Elle a peut-être été effacée de cet appareil.
          </EmptyState>
        ) : (
          <>
            <GameSummary game={game} />
            <div className="grid gap-2">
              <Button variant="play" size="lg" icon={<RotateCcw aria-hidden className="size-6" />} onClick={replay}>
                Rejouer avec la même tablée
              </Button>
              <Button variant="secondary" block icon={<House aria-hidden className="size-5" />} onClick={() => router.push("/")}>
                Accueil
              </Button>
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <Results />
    </Suspense>
  );
}
