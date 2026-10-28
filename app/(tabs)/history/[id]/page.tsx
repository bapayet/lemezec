"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { RotateCcw, SearchX, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { GameSummary, formatDate } from "@/components/game/GameSummary";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { startGame } from "@/lib/game/store";

// S12 Détail d'une partie
export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const game = useLiveQuery(() => db.games.get(id), [id], null);

  async function remove() {
    await db.transaction("rw", db.games, db.rounds, async () => {
      await db.rounds.where("gameId").equals(id).delete();
      await db.games.delete(id);
    });
    router.replace("/history");
  }

  return (
    <>
      <PageHeader title="Partie" back="/history" size="back" />
      <div className="mx-auto grid max-w-app gap-6 px-4 pt-6">
        {game === null ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : !game ? (
          <EmptyState icon={<SearchX />} title="Partie introuvable">Elle a peut-être été effacée de cet appareil.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-text-muted first-letter:uppercase">{formatDate(game.startedAt)}</p>
            <GameSummary game={game} />
            <div className="grid gap-2">
              <Button
                variant="primary"
                block
                icon={<RotateCcw aria-hidden className="size-5" />}
                onClick={async () => { await startGame(game.seats, game.difficulties); router.push("/game"); }}
              >
                Rejouer avec cette tablée
              </Button>
              <ConfirmDialog
                tone="danger"
                trigger={<Button variant="dangerGhost" block icon={<Trash2 aria-hidden className="size-5" />}>Supprimer de l&apos;historique</Button>}
                title="Supprimer cette partie ?"
                description="Elle disparaîtra de l'historique et des statistiques de cet appareil."
                confirmLabel="Supprimer"
                onConfirm={remove}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
