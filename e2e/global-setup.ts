// Garde-fou : on refuse de tester si le serveur de test est branché sur un vrai Supabase.
import type { FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0]?.use.baseURL ?? "http://localhost:3100";
  const res = await fetch(`${base}/api/admin/me`);
  const body = await res.json();
  if (body.configured !== false) {
    throw new Error("Le serveur de test voit un projet Supabase : arrêt pour ne pas écrire dans la vraie base.");
  }
}
