import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";

// Rafraîchit le jeton Supabase dans les cookies avant les routes API et l'espace admin.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (!supabaseConfigured()) return res;
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  await sb.auth.getUser();
  return res;
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/auth/:path*"],
};
