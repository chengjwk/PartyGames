// POST /api/login — validate the submitted password and, on match,
// set the HttpOnly auth cookie + redirect to the original target.
// On miss, re-render the login form with an error message.

import {
  COOKIE_NAME,
  TOKEN_TTL_MS,
  sanitizeNext,
  signToken,
  type PageEnv,
} from "../_lib";
import { loginPage } from "../_middleware";

export const onRequestPost: PagesFunction<PageEnv> = async (ctx) => {
  const form = await ctx.request.formData();
  const submitted = String(form.get("password") ?? "");
  const next = sanitizeNext(String(form.get("next") ?? "/"));

  // Constant-ish-time compare is fine here — JS string `===` is
  // O(min(len)) but the wins are negligible for a 6-12 char shared
  // password. Don't overthink it.
  if (
    !submitted ||
    !ctx.env.SITE_PASSWORD ||
    submitted !== ctx.env.SITE_PASSWORD
  ) {
    return loginPage({ next, errored: true });
  }

  const token = await signToken(ctx.env.SITE_SECRET);
  const maxAgeSec = Math.floor(TOKEN_TTL_MS / 1000);
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ].join("; ");

  return new Response(null, {
    status: 302,
    headers: {
      Location: next,
      "Set-Cookie": cookie,
      "cache-control": "no-store",
    },
  });
};
