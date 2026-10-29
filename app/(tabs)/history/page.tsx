"use client";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Crown, Play, RotateCcw, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { joinNames } from "@/components/game/GameSummary";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { scoreboard, winners } from "@/lib/game/logic";

function relativeDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Aujourd'hui, ${time}`;
  if (diff === 1) return `Hier, ${time}`;
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) + `, ${time}`;
}

function playersLabel(seats: string[]) {
  return seats.length <= 3 ? joinNames(seats) : `${seats.slice(0, 2).join(", ")} +${seats.length - 2}`;
}

// S03 Historique des parties
export default function HistoryPage() {
  const games = useLiveQuery(async () => {
    const all = await db.games.orderBy("startedAt").reverse().toArray();
    return Promise.all(
      all.map(async (g) => {
        const rounds = await db.rounds.where("gameId").equals(g.id).toArray();
        return { game: g, played: rounds.length, top: winners(scoreboard(g.seats, rounds)) };
      }),
    );
  });

  return (
    <>
      <PageHeader title="Parties" />
      <div className="mx-auto grid max-w-app gap-3 px-4 pt-6">
        {!games ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)
        ) : games.length === 0 ? (
          <EmptyState
            icon={<Trophy />}
            title="Pas encore de partie"
            action={
              <Link href="/setup" className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-5 text-lg text-on-accent hover:bg-accent-hover">
                <Play aria-hidden className="size-5" /> Lancer une partie
              </Link>
            }
          >
            Vos parties terminées s&apos;afficheront ici, avec le gagnant et les mots joués.
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {games.map(({ game, played, top }) => {
              const ongoing = game.status === "in_progress";
              return (
                <li key={game.id}>
                  <Link
                    href={ongoing ? "/game" : `/history/partie?id=${game.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 hover:bg-surface-muted"
                  >
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="text-sm text-text-muted">{relativeDay(game.startedAt)}</span>
                      <span className="truncate text-base font-semibold text-text">{playersLabel(game.seats)}</span>
                      <span className="flex items-center gap-1.5 text-sm text-text-muted">
                        {ongoing ? (
                          <><RotateCcw aria-hidden className="size-4 text-accent" /> En cours · tour {game.roundNumber}</>
                        ) : top.length ? (
                          <><Crown aria-hidden className="size-4 text-warning" /> {joinNames(top)} · {played} mots</>
                        ) : (
                          <>{played} mot{played > 1 ? "s" : ""} · aucun point</>
                        )}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-text-subtle" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
