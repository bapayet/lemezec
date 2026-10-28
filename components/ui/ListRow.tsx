import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "default" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  default: "text-text",
  warning: "text-warning",
  danger: "text-on-danger-soft",
};

const base =
  "flex min-h-14 w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left font-medium transition-colors duration-fast";

function Inner({ icon, children, hint, chevron }: { icon?: ReactNode; children: ReactNode; hint?: ReactNode; chevron?: boolean }) {
  return (
    <>
      {icon && <span aria-hidden className="shrink-0 [&>svg]:size-6">{icon}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {hint && <span className="shrink-0 text-sm font-normal text-text-subtle">{hint}</span>}
      {chevron && <ChevronRight aria-hidden className="size-5 shrink-0 text-text-subtle" />}
    </>
  );
}

export function ListRowLink({ href, icon, hint, children }: { href: string; icon?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className={cn(base, toneClass.default, "hover:bg-surface-muted")}>
      <Inner icon={icon} hint={hint} chevron>{children}</Inner>
    </Link>
  );
}

export function ListRowButton({
  icon, hint, tone = "default", disabled, onClick, children,
}: { icon?: ReactNode; hint?: ReactNode; tone?: Tone; disabled?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      className={cn(base, toneClass[tone], disabled ? "cursor-not-allowed" : "hover:bg-surface-muted")}
    >
      <Inner icon={icon} hint={hint}>{children}</Inner>
    </button>
  );
}

export function ListRowInfo({ icon, hint, children }: { icon?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn(base, toneClass.default)}>
      <Inner icon={icon} hint={hint}>{children}</Inner>
    </div>
  );
}
