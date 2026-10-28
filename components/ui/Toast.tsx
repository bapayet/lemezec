"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Toast = { id: number; message: string; action?: { label: string; run: () => void }; tone?: "info" | "error" };
type Ctx = { show: (t: Omit<Toast, "id">, ms?: number) => void };

const ToastContext = createContext<Ctx>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hovered = useRef(false);

  const show = useCallback((t: Omit<Toast, "id">, ms = 5000) => {
    clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    const close = () => (hovered.current ? (timer.current = setTimeout(close, 1000)) : setToast(null));
    timer.current = setTimeout(close, ms);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <div role="status" aria-live="polite" className="w-full max-w-app">
          {toast && (
            <div
              key={toast.id}
              onMouseEnter={() => (hovered.current = true)}
              onMouseLeave={() => (hovered.current = false)}
              className={cn(
                "pointer-events-auto flex items-center gap-3 rounded-md px-4 py-3 text-sm shadow-raised",
                toast.tone === "error" ? "bg-danger text-on-danger" : "bg-text text-surface",
              )}
            >
              <span className="flex-1">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className="h-9 rounded-sm px-2 font-bold text-accent-soft underline-offset-2 hover:underline"
                  onClick={() => { toast.action!.run(); setToast(null); }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
