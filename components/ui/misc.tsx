// Petites primitives : IconButton, Card, SectionLabel, EmptyState, StatTile, Skeleton, Chip, TextField.
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { UserPlus, X } from "lucide-react";
import { cn } from "@/lib/cn";

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "accent" | "ghost" | "onGradient" }
>(function IconButton({ label, tone = "ghost", className, children, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid size-12 shrink-0 place-items-center rounded-md transition-colors duration-fast disabled:opacity-50",
        tone === "accent" && "bg-accent text-on-accent hover:bg-accent-hover",
        tone === "ghost" && "text-text-muted hover:bg-surface-muted",
        tone === "onGradient" && "text-on-gradient hover:bg-overlay-on-gradient",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export function Card({ tone = "surface", className, children }: { tone?: "surface" | "overlay" | "muted"; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl",
        tone === "surface" && "bg-surface p-5 text-text shadow-card",
        tone === "overlay" && "bg-overlay-on-gradient p-4 text-on-gradient",
        tone === "muted" && "bg-surface-muted p-4 text-text",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, onGradient, as: Tag = "h2" }: { children: ReactNode; onGradient?: boolean; as?: "h2" | "h3" | "p" }) {
  return (
    <Tag className={cn("text-xs font-semibold uppercase tracking-wider", onGradient ? "text-on-gradient-muted" : "text-text-muted")}>
      {children}
    </Tag>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
      <span aria-hidden className="text-text-subtle [&>svg]:size-12">{icon}</span>
      <h2 className="text-lg text-text-muted">{title}</h2>
      {children && <p className="max-w-72 text-sm text-text-subtle">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function StatTile({ icon, value, label, tone }: { icon: ReactNode; value: ReactNode; label: string; tone: "accent" | "success" | "warning" }) {
  return (
    <div className="grid justify-items-center gap-1 rounded-lg border border-border bg-surface px-2 py-4 text-center">
      <span aria-hidden className={cn("[&>svg]:size-7", tone === "accent" && "text-accent", tone === "success" && "text-success", tone === "warning" && "text-warning")}>
        {icon}
      </span>
      <span className="text-2xl text-text">{value}</span>
      <span className="text-sm text-text-muted">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none", className)} />;
}

export function SuggestionChip({ name, onAdd }: { name: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Ajouter ${name}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 text-sm text-text-muted hover:border-accent hover:text-accent"
    >
      <UserPlus aria-hidden className="size-4" />
      {name}
    </button>
  );
}

export function SelectedChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-9 max-w-full items-center gap-1 rounded-pill border-[1.5px] border-accent bg-accent-soft pl-3 text-sm font-semibold text-on-accent-soft">
      <span className="truncate">{name}</span>
      <button type="button" onClick={onRemove} aria-label={`Retirer ${name}`} className="grid size-9 shrink-0 place-items-center rounded-pill hover:bg-surface">
        <X aria-hidden className="size-4" />
      </button>
    </span>
  );
}

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string; errorId?: string }>(
  function TextField({ error, errorId, className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 w-full min-w-0 rounded-md border bg-surface px-3.5 text-base text-text placeholder:text-text-subtle",
          "focus:outline-2 focus:outline-offset-0",
          error ? "border-2 border-danger focus:outline-danger" : "border-border-input focus:border-accent focus:outline-focus",
          className,
        )}
        {...rest}
      />
    );
  },
);
