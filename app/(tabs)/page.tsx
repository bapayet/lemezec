"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, History, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OfflineBanner } from "@/components/shell/AppProviders";
import { db } from "@/lib/db";
import { currentGame } from "@/lib/game/store";

// S01 Accueil
export default function HomePage() {
  const router = useRouter();
  const ongoing = useLiveQuery(currentGame, [], null);
  const wordCount = useLiveQuery(() => db.words.where("status").equals("active").count(), [], undefined);

  return (
    <div className="flex min-h-dvh flex-col bg-app-gradient text-on-gradient">
      <OfflineBanner wordCount={wordCount} />
      <div className="mx-auto flex w-full max-w-app flex-1 flex-col px-4 pb-24 pt-20">
        <div className="text-center">
          <h1 className="text-display tracking-tight">Lemezec</h1>
          <p className="mx-auto mt-4 max-w-80 text-lg font-normal text-on-gradient-muted">
            Des mots oubliés, des définitions à deviner, un seul téléphone pour toute la tablée.
          </p>
        </div>

        <div className="mt-auto grid gap-3 pt-12">
          {ongoing ? (
            <>
              <Button variant="play" size="lg" icon={<RotateCcw aria-hidden className="size-6" />} onClick={() => router.push("/game")}>
                Reprendre la partie
              </Button>
              <p className="-mt-1 text-center text-sm text-on-gradient-muted">
                Tour {ongoing.roundNumber} · {ongoing.seats.join(", ")}
              </p>
              <Button variant="secondary" size="md" block icon={<Play aria-hidden className="size-5" />} onClick={() => router.push("/setup")}>
                Nouvelle partie
              </Button>
            </>
          ) : (
            <Button variant="play" size="lg" icon={<Play aria-hidden className="size-6" />} onClick={() => router.push("/setup")}>
              Lancer une partie
            </Button>
          )}
          <Link href="/history" className="inline-flex h-12 items-center justify-center gap-2.5 rounded-lg bg-surface text-lg text-accent hover:bg-accent-soft">
            <History aria-hidden className="size-5" /> Historique
          </Link>
          <Link href="/rules" className="inline-flex h-12 items-center justify-center gap-2.5 rounded-lg bg-surface text-lg text-accent hover:bg-accent-soft">
            <BookOpen aria-hidden className="size-5" /> Comment jouer
          </Link>
        </div>
      </div>
    </div>
  );
}
