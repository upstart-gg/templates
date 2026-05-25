import { type RouterContextProvider } from "react-router";
import * as arctic from "arctic";
import { authConfig } from "../config";
import {
  createProvider,
  generateAuthorizationUrl,
  setOAuthCookies,
  getOAuthCookies,
  clearOAuthCookies,
  fetchUserProfile,
} from "../oauth.server";
import { signSession, setSessionCookie } from "../session.server";
import type { AuthSession } from "../types";
import { getKyselyClient } from "~/lib/kysely.server";
import { envContext } from "~/.internal/env.context";
import type { Kysely } from "kysely";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEnv(
  context: RouterContextProvider,
): Record<string, string | undefined> {
  return context.get(envContext) as Record<string, string | undefined>;
}

function getRedirectUri(request: Request, providerId: string): string {
  const url = new URL(request.url);
  // Build the callback URL: same origin, at /auth/oauth/<provider>/callback
  return `${url.origin}/auth/oauth/${providerId}/callback`;
}

function getProviderConfig(providerId: string) {
  const config = authConfig.oauth.providers.find((p) => p.id === providerId);
  if (!config) {
    throw new Error(
      `OAuth provider "${providerId}" is not configured in auth.json. ` +
        `Add it to oauth.providers and set the required env vars.`,
    );
  }
  return config;
}

// ---------------------------------------------------------------------------
// Initiate OAuth flow
// ---------------------------------------------------------------------------

/**
 * Initiate an OAuth authorization flow for the given provider.
 *
 * Call this from your route loader, e.g.:
 * ```ts
 * // app/routes/auth.oauth.$provider.tsx
 * import { handleOAuthInitiate } from "~/lib/auth/actions/oauth.server";
 *
 * export async function loader({ params, request, context }) {
 *   return handleOAuthInitiate(params.provider, request, context);
 * }
 * ```
 *
 * Returns a redirect Response to the provider's authorization URL.
 */
export async function handleOAuthInitiate(
  providerId: string,
  request: Request,
  context: RouterContextProvider,
): Promise<Response> {
  if (!authConfig.enabled) {
    throw new Response("Auth is disabled", { status: 403 });
  }

  const providerConfig = getProviderConfig(providerId);
  const redirectUri = getRedirectUri(request, providerId);
  const provider = createProvider(providerConfig, getEnv(context), redirectUri);

  const { url, state, codeVerifier } = await generateAuthorizationUrl(
    provider,
    providerId,
  );

  const headers = new Headers();
  setOAuthCookies(headers, state, codeVerifier);
  headers.set("Location", url.toString());

  return new Response(null, { status: 302, headers });
}

// ---------------------------------------------------------------------------
// Handle OAuth callback
// ---------------------------------------------------------------------------

type CallbackSuccess = { session: AuthSession; headers: Headers };
type CallbackError = { error: string };

/**
 * Handle the OAuth provider callback after user authorization.
 *
 * Call this from your callback route loader, e.g.:
 * ```ts
 * // app/routes/auth.oauth.$provider.callback.tsx
 * import { handleOAuthCallback } from "~/lib/auth/actions/oauth.server";
 *
 * export async function loader({ params, request, context }) {
 *   const result = await handleOAuthCallback(params.provider, request, context);
 *   if ("error" in result) throw new Response(result.error, { status: 400 });
 *   return redirect("/", { headers: result.headers });
 * }
 * ```
 *
 * On success returns `{ session, headers }` where `headers` contains the
 * `Set-Cookie` header for the session token. The caller decides where to
 * redirect the user.
 *
 * On failure returns `{ error: string }`.
 */
export async function handleOAuthCallback(
  providerId: string,
  request: Request,
  context: RouterContextProvider,
): Promise<CallbackSuccess | CallbackError> {
  if (!authConfig.enabled) {
    return { error: "Auth is disabled" };
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  if (!code) {
    return { error: "Missing authorization code in callback" };
  }

  // Validate state
  const { state: storedState, codeVerifier } = getOAuthCookies(request);
  if (!storedState || !codeVerifier) {
    return {
      error: "Missing OAuth state cookies — possible CSRF or expired session",
    };
  }
  if (storedState !== returnedState) {
    return { error: "OAuth state mismatch — possible CSRF attack" };
  }

  const providerConfig = getProviderConfig(providerId);
  const redirectUri = getRedirectUri(request, providerId);
  const provider = createProvider(providerConfig, getEnv(context), redirectUri);

  // Exchange code for tokens
  let tokens: arctic.OAuth2Tokens;
  try {
    tokens = await provider.validateAuthorizationCode(code, codeVerifier);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Token exchange failed: ${msg}` };
  }

  // Fetch user profile
  let profile: { email: string; id: string };
  try {
    profile = await fetchUserProfile(providerId, tokens);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Failed to fetch user profile: ${msg}` };
  }

  if (!profile.email) {
    return { error: "OAuth provider did not return an email address" };
  }

  // Find or create user in the configured datasource.
  // The table name comes from authConfig at runtime, so we widen to a generic
  // Kysely type. Individual query results are narrowed with explicit casts below.
  const db = getKyselyClient() as unknown as Kysely<
    Record<string, Record<string, unknown>>
  >;

  type UserRow = {
    $id: string;
    email: string;
    oauth_provider: string;
    oauth_provider_id: string;
  };

  let userId: string;

  try {
    // Try to find by provider + provider user id first
    const existingByProvider = (await db
      .selectFrom(authConfig.usersDatasourceId)
      .select(["$id"])
      .where("oauth_provider", "=", providerId)
      .where("oauth_provider_id", "=", profile.id)
      .executeTakeFirst()) as UserRow | undefined;

    if (existingByProvider) {
      userId = existingByProvider.$id;
    } else {
      // Fall back to email match (allows linking OAuth to an existing account)
      const existingByEmail = (await db
        .selectFrom(authConfig.usersDatasourceId)
        .select(["$id"])
        .where("email", "=", profile.email)
        .executeTakeFirst()) as UserRow | undefined;

      if (existingByEmail) {
        userId = existingByEmail.$id;
        // Update provider info on the existing account
        await db
          .updateTable(authConfig.usersDatasourceId)
          .set({ oauth_provider: providerId, oauth_provider_id: profile.id })
          .where("$id", "=", userId)
          .execute();
      } else {
        // Create new user
        const { nanoid } = await import("nanoid");
        userId = nanoid(16);
        await db
          .insertInto(authConfig.usersDatasourceId)
          .values({
            $id: userId,
            email: profile.email,
            oauth_provider: providerId,
            oauth_provider_id: profile.id,
            $creationDate: new Date().toISOString(),
            $lastModificationDate: new Date().toISOString(),
          })
          .execute();
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Database error: ${msg}` };
  }

  // Sign JWT session
  const secret = context.get(envContext).AUTH_SECRET;
  if (!secret) {
    return { error: "AUTH_SECRET is not configured" };
  }

  const nowSecs = Math.floor(Date.now() / 1000);
  const maxAgeSecs = authConfig.session.maxAgeDays * 24 * 60 * 60;

  const session: AuthSession = {
    userId,
    email: profile.email,
    provider: providerId,
    issuedAt: nowSecs,
    expiresAt: nowSecs + maxAgeSecs,
    lastActiveAt: nowSecs,
  };

  const token = await signSession(session, secret);

  const headers = new Headers();
  clearOAuthCookies(headers);
  setSessionCookie(headers, token, authConfig.session.maxAgeDays);

  return { session, headers };
}
