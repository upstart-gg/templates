import { clearSessionCookie } from "../session.server";

/**
 * Build the response headers needed to sign a user out.
 * Clears the session cookie. The caller is responsible for redirecting.
 *
 * @example
 * // app/routes/sign-out.tsx
 * import { buildSignOutHeaders } from "~/lib/auth/actions/sign-out.server";
 *
 * export async function action() {
 *   const headers = buildSignOutHeaders();
 *   return redirect("/", { headers });
 * }
 */
export function buildSignOutHeaders(): Headers {
  const headers = new Headers();
  clearSessionCookie(headers);
  return headers;
}
