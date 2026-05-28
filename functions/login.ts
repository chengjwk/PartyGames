// GET /login — render the login form. Hitting /login directly (e.g.
// to "log out" by clearing the cookie elsewhere and revisiting) shows
// a fresh form. The middleware lets this path through unguarded.

import { loginPage } from "./_middleware";
import { sanitizeNext, type PageEnv } from "./_lib";

export const onRequestGet: PagesFunction<PageEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const next = sanitizeNext(url.searchParams.get("next"));
  return loginPage({ next, errored: false });
};
