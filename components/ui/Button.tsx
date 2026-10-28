import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "play" | "primary" | "secondary" | "ghost" | "danger" | "dangerGhost" | "muted";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  play: "bg-play-gradient text-on-play shadow-cta",
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-accent ring-1 ring-inset ring-border hover:bg-accent-soft",
  ghost: "bg-transparent text-accent hover:bg-accent-soft",
  danger: "bg-danger text-on-danger",
  dangerGhost: "bg-transparent text-on-danger-soft hover:bg-danger-soft",
  muted: "bg-overlay-on-gradient text-on-gradient",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm font-semibold rounded-pill",
  md: "h-12 px-5 text-lg rounded-lg",
  lg: "h-16 px-6 text-xl rounded-lg w-full",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, loading, block, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2.5 transition-[background-color,transform] duration-fast ease-app",
        "active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
});
