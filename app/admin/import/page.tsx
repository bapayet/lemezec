import { AdminPending } from "@/components/shell/AdminPending";

// S06 Import de mots (Wiktionnaire, Google Sheet, CSV) : attend /replica-backend
export default function AdminImportPage() {
  return <AdminPending title="Importer des mots" what="L'import depuis le Wiktionnaire, un Google Sheet ou un fichier CSV" />;
}
