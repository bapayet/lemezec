"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, House, Settings, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/history", label: "Parties", icon: Trophy },
  { href: "/statistics", label: "Stats", icon: ChartNoAxesColumn },
  { href: "/settings", label: "Réglages", icon: Settings },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid h-16 max-w-app grid-cols-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="contents">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "grid place-items-center content-center gap-0.5 text-xs",
                  active ? "font-semibold text-tab-active shadow-[inset_0_3px_0_var(--lz-color-tab-active)]" : "text-tab-inactive hover:text-text",
                )}
              >
                <Icon aria-hidden className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
