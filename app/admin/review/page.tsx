import { AdminPending } from "@/components/shell/AdminPending";

// S14 Relecture des mots en attente et signalés : attend /replica-backend
export default function AdminReviewPage() {
  return <AdminPending title="Relecture" what="La relecture des 501 mots en attente et des mots signalés" />;
}
