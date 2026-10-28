"use client";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChartNoAxesColumn, Crown, Percent, Play, Target } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState, Skeleton, StatTile } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { scoreboard, winners } from "@/lib/game/logic";
import type { Word } from "@/lib/types";

async function computeStats() {
  const games = await db.games.where("status").equals("finished").toArray();
  const rounds = await db.rounds.toArray();
  const finishedIds = new Set(games.map((g) => g.id));
  const played = rounds.filter((r) => finishedIds.has(r.gameId));
  const found = played.filter((r) => r.finders.length > 0).length;

  const wins = new Map<string, number>();
  const points = new Map<string, number>();
  for (const g of games) {
    const gr = played.filter((r) => r.gameId === g.id);
    for (const line of scoreboard(g.seats, gr)) points.set(line.name, (points.get(line.name) ?? 0) + line.score);
    for (const w of winners(scoreboard(g.seats, gr))) wins.set(w, (wins.get(w) ?? 0) + 1);
  }
  const champions = [...points.entries()]
    .map(([name, pts]) => ({ name, pts, wins: wins.get(name) ?? 0 }))
    .sort((a, b) => b.wins - a.wins || b.pts - a.pts)
    .slice(0, 5);

  // les mots qui ont résisté : joués et jamais trouvés
  const byWord = new Map<string, { plays: number; found: number }>();
  for (const r of played) {
    const s = byWord.get(r.wordId) ?? { plays: 0, found: 0 };
    s.plays++;
    if (r.finders.length) s.found++;
    byWord.set(r.wordId, s);
  }
  const toughIds = [...byWord.entries()].filter(([, s]) => s.found === 0).slice(-5).map(([id]) => id);
  const tough = (await db.words.bulkGet(toughIds)).filter(Boolean) as Word[];

  return { games: games.length, words: played.length, rate: played.length ? Math.round((found / played.length) * 100) : 0, champions, tough };
}

// S04 Statistiques
export default function StatisticsPage() {
  const s = useLiveQuery(computeStats);

  return (
    <>
      <PageHeader title="Statistiques" />
      <div className="mx-auto grid max-w-app gap-6 px-4 pt-6">
        <div className="grid grid-cols-3 gap-2">
          {!s ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)
          ) : (
            <>
              <StatTile tone="accent" icon={<ChartNoAxesColumn />} value={s.games} label="Parties" />
              <StatTile tone="success" icon={<Target />} value={s.words} label="Mots joués" />
              <StatTile tone="warning" icon={<Percent />} value={`${s.rate} %`} label="Trouvés" />
            </>
          )}
        </div>

        {s && s.games === 0 ? (
          <div className="rounded-xl bg-surface shadow-card">
            <EmptyState
              icon={<ChartNoAxesColumn />}
              title="Rien à compter pour l'instant"
              action={
                <Link href="/setup" className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-5 text-lg text-on-accent hover:bg-accent-hover">
                  <Play aria-hidden className="size-5" /> Lancer une partie
                </Link>
              }
            >
              Terminez une première partie pour voir vos champions et les mots qui vous ont résisté.
            </EmptyState>
          </div>
        ) : s ? (
          <>
            <section aria-labelledby="champions" className="grid gap-2">
              <h2 id="champions" className="flex items-center gap-2 text-lg text-text"><Crown aria-hidden className="size-5 text-warning" /> Champions</h2>
              <ol className="grid gap-2">
                {s.champions.map((c, i) => (
                  <li key={c.name} className="flex h-12 items-center gap-3 rounded-md border border-border bg-surface px-4">
                    <span className="w-5 text-sm text-text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-text">{c.name}</span>
                    <span className="text-sm text-text-muted">{c.wins} victoire{c.wins > 1 ? "s" : ""} · {c.pts} pt{c.pts > 1 ? "s" : ""}</span>
                  </li>
                ))}
              </ol>
            </section>
            {s.tough.length > 0 && (
              <section aria-labelledby="coriaces" className="grid gap-2">
                <h2 id="coriaces" className="text-lg text-text">Mots que personne n&apos;a trouvés</h2>
                <ul className="grid gap-2">
                  {s.tough.map((w) => (
                    <li key={w.id} className="rounded-md border border-border bg-surface px-4 py-3">
                      <p lang="fr" className="font-bold text-text">{w.word}</p>
                      <p lang="fr" className="text-sm text-text-muted">{w.definition}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
