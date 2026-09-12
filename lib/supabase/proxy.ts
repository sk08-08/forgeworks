import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        /*
         * Update the request cookies first so
         * Server Components / Server Actions
         * in this same request see the refreshed
         * Supabase session.
         */
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        /*
         * Re-create the response with the
         * updated request.
         */
        response = NextResponse.next({
          request,
        });

        /*
         * Send refreshed cookies back to
         * the browser.
         */
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  /*
   * IMPORTANT:
   * This is what validates / refreshes the
   * current Supabase Auth session.
   *
   * Keep it immediately after client creation.
   */
  const { data: claimsData } = await supabase.auth.getClaims();

  /*
   * forgeworks_session is no longer an
   * authentication source.
   *
   * If there is no real Supabase session,
   * do not leave stale app metadata around.
   */
  if (!claimsData?.claims?.sub) {
    request.cookies.delete("forgeworks_session");

    response.cookies.delete("forgeworks_session");
  }

  return response;
}
