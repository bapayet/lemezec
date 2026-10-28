// PROVISOIRE : accepte le signalement sans le stocker. /replica-backend l'écrira dans word_reports.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (typeof body?.wordId !== "string") return NextResponse.json({ error: "wordId manquant" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
