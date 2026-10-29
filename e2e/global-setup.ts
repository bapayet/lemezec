// Garde-fou : on refuse de tester si le serveur de test est branché sur un vrai Supabase.
export default async function globalSetup() {
  const res = await fetch("http://localhost:3100/api/admin/me");
  const body = await res.json();
  if (body.configured !== false) {
    throw new Error("Le serveur de test voit un projet Supabase : arrêt pour ne pas écrire dans la vraie base.");
  }
}
