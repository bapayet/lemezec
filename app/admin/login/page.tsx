import { AdminPending } from "@/components/shell/AdminPending";

// S13 Connexion admin (lien magique) : attend /replica-backend
export default function AdminLoginPage() {
  return <AdminPending title="Espace admin" what="La connexion par lien magique" />;
}
