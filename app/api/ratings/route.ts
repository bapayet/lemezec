// PROVISOIRE : accepte les évaluations sans les stocker. /replica-backend les écrira dans word_ratings
// (on conflict do nothing sur l'id fourni par l'appareil).
import { NextResponse } from "next/server";
import { RATINGS } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body) || body.length > 100) return NextResponse.json({ error: "lot invalide" }, { status: 400 });
  const valid = body.filter((r) => typeof r?.id === "string" && typeof r?.wordId === "string" && RATINGS.includes(r?.rating));
  return NextResponse.json({ accepted: valid.length, duplicates: 0 });
}
