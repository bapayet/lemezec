// PROVISOIRE : sert la base nettoyée depuis un fichier, avec le contrat définitif de GET /api/words/sync
// (architecture.md). /replica-backend remplacera la source par Supabase sans toucher au client.
import { NextResponse } from "next/server";
import seed from "@/lib/server/seed-words.json";
import type { Word } from "@/lib/types";

const PAGE = 1000;
const words = (seed as Word[]).slice().sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id));

export function GET(req: Request) {
  const after = new URL(req.url).searchParams.get("after");
  let start = 0;
  if (after) {
    const [updatedAt, id] = after.split(",");
    start = words.findIndex((w) => w.updatedAt > updatedAt || (w.updatedAt === updatedAt && w.id > id));
    if (start === -1) start = words.length;
  }
  const page = words.slice(start, start + PAGE);
  const last = page.at(-1);
  return NextResponse.json({
    words: page,
    nextCursor: last ? { updatedAt: last.updatedAt, id: last.id } : null,
    done: start + PAGE >= words.length,
  });
}
