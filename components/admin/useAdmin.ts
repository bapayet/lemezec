"use client";
import { useCallback, useEffect, useState } from "react";

export type AdminState = { loading: boolean; configured: boolean; admin: boolean; email: string | null };

export function useAdmin() {
  const [s, set] = useState<AdminState>({ loading: true, configured: true, admin: false, email: null });
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/me", { cache: "no-store" }).then((x) => x.json());
      set({ loading: false, configured: r.configured, admin: r.admin, email: r.email ?? null });
    } catch {
      set((p) => ({ ...p, loading: false }));
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { ...s, refresh };
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
  return data as T;
}
