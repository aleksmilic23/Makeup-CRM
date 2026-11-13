import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail } from "@/lib/auth";

// Paths reachable without logging in:
// - /login itself
// - /view/[id]: the client-facing invoice page linked from invoice emails
// - /api/invoices/[id]/pdf: the PDF download on that client-facing page
// - /api/cron/*: Vercel cron, protected by CRON_SECRET instead
function isPublic(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/view/") ||
    pathname.startsWith("/api/cron/") ||
    /^\/api\/invoices\/[^/]+\/pdf$/.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Validates the session with Supabase and refreshes the cookie if needed.
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (isPublic(pathname)) {
    if (pathname === "/login" && user && isAllowedEmail(user.email)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  if (!user || !isAllowedEmail(user.email)) {
    if (user) await supabase.auth.signOut();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    if (user) url.searchParams.set("error", "not-allowed");
    else if (pathname !== "/") url.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
