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
 * In the sandbox preview (`APP_ENV=sandbox`) a request without a valid
 * session is NOT redirected: a fake `AuthSession` (see `SANDBOX_SESSION`) is
 * injected so every protected page can be previewed and tested without
 * signing in. A real session cookie (obtained through the login page) still
 * takes precedence, so the OAuth flow itself can be tested in the sandbox.
 *
 * On an invalid or expired session the user is redirected to the login page
 * (`loginPath` in auth.json, default `/login`). A request for the login page
 * itself is never redirected: it passes through with a `null` session so the
 * page can render even when it lives under a protected layout. This is what
 * prevents "redirected you too many times" loops.
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
  const isSandbox = env.APP_ENV === "sandbox";
  const secret = env.AUTH_SECRET;
  if (!secret && !isSandbox) {
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
  const session =
    token && secret ? await verifySession(token, secret, inactivitySecs) : null;

  if (!session && isSandbox) {
    // Sandbox preview: let the page render with a fake session so it can be
    // tested without signing in. Never taken in production.
    context.set(authContext, buildSandboxSession());
    return next();
  }

  if (!session) {
    const { pathname } = new URL(request.url);
    const loginPath = authConfig.loginPath;
    // Never redirect the login page to itself: let it render unauthenticated.
    if (isSamePath(pathname, loginPath)) {
      context.set(authContext, null);
      return next();
    }
    throw redirect(loginPath);
  }

  context.set(authContext, session);

  const response = (await next()) as Response;

  // Sliding window: re-issue the token with a fresh lastActiveAt when stale.
  if (secret && shouldRefreshSession(session)) {
    const nowSecs = Math.floor(Date.now() / 1000);
    const refreshed: AuthSession = { ...session, lastActiveAt: nowSecs };
    const newToken = await signSession(refreshed, secret);
    setSessionCookie(response.headers, newToken, authConfig.session.maxAgeDays);
  }

  return response;
};

/**
 * Fake session used in the sandbox preview when the visitor is not signed in.
 * `userId` does not exist in the users datasource, so queries filtered by
 * `userId` return nothing for this user, which is expected for a preview.
 */
export const SANDBOX_SESSION: Pick<AuthSession, "userId" | "email" | "provider"> = {
  userId: "fake-user",
  email: "fake-user@example.com",
  provider: "sandbox",
};

function buildSandboxSession(): AuthSession {
  const nowSecs = Math.floor(Date.now() / 1000);
  return {
    ...SANDBOX_SESSION,
    issuedAt: nowSecs,
    expiresAt: nowSecs + 24 * 60 * 60,
    lastActiveAt: nowSecs,
  };
}

/** Compares two URL paths ignoring a trailing slash. */
function isSamePath(a: string, b: string): boolean {
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  return norm(a) === norm(b);
}
