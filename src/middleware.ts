import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session on every request and
 * redirects unauthenticated users to /login.
 *
 * Public routes (no auth required):
 *  - /login
 *  - Static assets & Next.js internals (_next, favicon, etc.)
 *
 * Test mode (NEXT_PUBLIC_TEST_MODE=true):
 *  - Skips auth entirely so pages can be tested without credentials.
 *  - Never enable in production.
 */
export async function middleware(request: NextRequest) {
  // Test mode: skip auth entirely so Claude/CI can verify page rendering
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    return NextResponse.next({ request });
  }

  return await updateSession(request);
}

async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  const isPublicRoute =
    pathname === '/login' ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/api/strava/webhook' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icons/');

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // IMPORTANT: Do NOT use supabase.auth.getSession() here.
    // getUser() sends a request to the Supabase Auth server every time
    // to revalidate the Auth token, while getSession() does not.
    const { data, error: authError } = await supabase.auth.getUser();
    const user = data?.user ?? null;

    if (!user && !isPublicRoute) {
      // Unauthenticated user trying to access a protected route — redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  } catch {
    // If auth check fails (network error, bad config, etc.), redirect to login
    // unless we're already on a public route
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets (images, manifest, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)',
  ],
};
