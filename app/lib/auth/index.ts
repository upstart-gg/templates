/**
 * Auth library for template-default
 * ================================
 *
 * This module provides a stateless OAuth-based authentication system for
 * Upstart user sites. Sessions are stored as signed JWTs in HttpOnly cookies.
 * User accounts are stored in a datasource (Cloudflare D1 / SQLite).
 *
 * ## Quick start
 *
 * 1. Enable auth in `app/config/auth.json`:
 *    ```json
 *    { "enabled": true, "oauth": { "providers": [{ "id": "google", ... }] } }
 *    ```
 *
 * 2. Add the AUTH_SECRET env var (≥32 chars) and declare it in site.json.
 *
 * 3. Copy the default datasource to your config folder and register it:
 *    ```bash
 *    cp app/lib/auth/datasources/auth_users.ts app/config/datasources/
 *    pnpm exec upstart-create-datasource app/config/datasources/auth_users.ts
 *    ```
 *
 * 4. Protect a route by adding the middleware:
 *    ```ts
 *    import { authMiddleware, authContext } from "~/lib/auth/middleware.server";
 *    export const middleware = [authMiddleware];
 *    export async function loader({ context }) {
 *      const session = context.get(authContext)!;
 *      return { email: session.email };
 *    }
 *    ```
 *
 * 5. Create your own sign-in / callback routes using the action helpers:
 *    ```ts
 *    import { handleOAuthInitiate, handleOAuthCallback } from "~/lib/auth/actions/oauth.server";
 *    import { buildSignOutHeaders } from "~/lib/auth/actions/sign-out.server";
 *    ```
 */

// Middleware & context
export { authMiddleware, authContext } from "./middleware.server";

// Types
export type { AuthSession } from "./types";

// Config helpers
export {
  authConfig,
  authConfigSchema,
  PROVIDER_META,
  getProviderEnvVarDescriptions,
} from "./config";
export type { AuthConfig, OAuthProviderConfig } from "./config";

// Session utilities (server-side only)
export {
  signSession,
  verifySession,
  shouldRefreshSession,
  setSessionCookie,
  clearSessionCookie,
  getTokenFromRequest,
  getSessionCookieName,
} from "./session.server";

// OAuth utilities (server-side only)
export {
  createProvider,
  generateAuthorizationUrl,
  setOAuthCookies,
  getOAuthCookies,
  clearOAuthCookies,
  fetchUserProfile,
} from "./oauth.server";

// Action helpers
export {
  handleOAuthInitiate,
  handleOAuthCallback,
} from "./actions/oauth.server";
export { buildSignOutHeaders } from "./actions/sign-out.server";
