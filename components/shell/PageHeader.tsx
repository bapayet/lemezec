"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

/** En-tête dégradé. large = titre seul (onglets) ; back = flèche retour + titre. */
export function PageHeader({ title, back, action, size = "large" }: { title: string; back?: string | true; action?: ReactNode; size?: "large" | "back" }) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "bg-app-gradient text-on-gradient",
        size === "large" ? "px-4 pb-6 pt-14" : "px-2 py-3",
      )}
    >
      <div className="mx-auto flex max-w-app items-center gap-1">
        {back && (
          <IconButton
            label="Retour"
            tone="onGradient"
            onClick={() => (back === true ? router.back() : router.push(back))}
          >
            <ArrowLeft aria-hidden className="size-6" />
          </IconButton>
        )}
        <h1 className={cn("min-w-0 flex-1 truncate", size === "large" ? "text-2xl" : "text-xl")}>{title}</h1>
        {action}
      </div>
    </header>
  );
}
