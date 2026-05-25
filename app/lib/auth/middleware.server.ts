import { createContext, redirect, type MiddlewareFunction } from "react-router";
import { authConfig } from "./config";
import {
  getTokenFromRequest,
  verifySession,
  signSession,
  setSessionCookie,
  shouldRefreshSession,
} from "./session.server";
import type { AuthSession } from "./types";
import { envContext } from "~/.internal/env.context";

/**
 * React Router context key for the authenticated session.
 * Available in loaders/actions on routes that use `authMiddleware`.
 *
 * @example
 * import { authContext } from "~/lib/auth/middleware.server";
 * export async function loader({ context }) {
 *   const session = context.get(authContext); // AuthSession
 *   return { email: session.email };
 * }
 */
export const authContext = createContext<AuthSession | null>(null);

/**
 * React Router middleware that enforces authentication on any route it is
 * applied to. Add it to the `middleware` export of the routes you want to
 * protect.
 *
 * When auth is disabled in auth.json (`enabled: false`) the middleware is a
 * no-op and every request passes through.
 *
 * On an invalid or expired session the user is redirected to
 * `env.UP_SITE_URL ?? "/"` (read from `envContext`).
 *
 * When a valid session is found the decoded `AuthSession` is stored on the
 * React Router context under `authContext` so downstream loaders/actions can
 * read it.
 *
 * The middleware also implements a **sliding inactivity window**: if the
 * session is valid but the `lastActiveAt` timestamp is stale the token is
 * re-issued with a fresh timestamp after the response is produced.
 *
 * @example
 * // app/routes/dashboard.tsx
 * import { authMiddleware, authContext } from "~/lib/auth/middleware.server";
 *
 * export const middleware = [authMiddleware];
 *
 * export async function loader({ context }) {
 *   const session = context.get(authContext)!;
 *   return { email: session.email };
 * }
 */
export const authMiddleware: MiddlewareFunction = async (
  { request, context },
  next,
) => {
  if (!authConfig.enabled) {
    return next();
  }

  const env = context.get(envContext);
  const secret = env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is not set. " +
        "Add it to your environment and declare it in site.json#envVars.",
    );
  }

  const inactivitySecs =
    authConfig.session.inactivityTimeoutMinutes !== undefined
      ? authConfig.session.inactivityTimeoutMinutes * 60
      : undefined;

  const token = getTokenFromRequest(request);
  const session = token
    ? await verifySession(token, secret, inactivitySecs)
    : null;

  if (!session) {
    const fallbackUrl = env.UP_SITE_URL ?? "/";
    throw redirect(fallbackUrl);
  }

  context.set(authContext, session);

  const response = (await next()) as Response;

  // Sliding window: re-issue the token with a fresh lastActiveAt when stale.
  if (shouldRefreshSession(session)) {
    const nowSecs = Math.floor(Date.now() / 1000);
    const refreshed: AuthSession = { ...session, lastActiveAt: nowSecs };
    const newToken = await signSession(refreshed, secret);
    setSessionCookie(response.headers, newToken, authConfig.session.maxAgeDays);
  }

  return response;
};
