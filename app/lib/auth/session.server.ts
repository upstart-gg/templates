import { SignJWT, jwtVerify } from "jose";
import type { AuthSession } from "./types";

const COOKIE_NAME = "__auth_session";
const ALGORITHM = "HS256";
/** Refresh lastActiveAt if it is older than this many seconds */
const REFRESH_THRESHOLD_SECS = 60;

function getSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Sign an AuthSession as a JWT. The token expires at `session.expiresAt`.
 */
export async function signSession(
  session: AuthSession,
  secret: string,
): Promise<string> {
  return new SignJWT({
    email: session.email,
    provider: session.provider,
    lat: session.lastActiveAt,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(session.userId)
    .setIssuedAt(session.issuedAt)
    .setExpirationTime(session.expiresAt)
    .sign(getSecret(secret));
}

/**
 * Verify a JWT and decode it into an AuthSession.
 *
 * @param token - The raw JWT string from the cookie.
 * @param secret - The AUTH_SECRET environment variable.
 * @param inactivityTimeoutSecs - Optional inactivity limit in seconds.
 *   If the token's `lat` (lastActiveAt) is older than this, the session is
 *   considered expired even if the JWT itself has not yet expired.
 *
 * @returns The decoded AuthSession, or null if invalid / expired.
 */
export async function verifySession(
  token: string,
  secret: string,
  inactivityTimeoutSecs?: number,
): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(secret), {
      algorithms: [ALGORITHM],
    });

    const lastActiveAt = payload.lat as number;

    if (inactivityTimeoutSecs !== undefined) {
      const nowSecs = Math.floor(Date.now() / 1000);
      if (nowSecs - lastActiveAt > inactivityTimeoutSecs) {
        return null;
      }
    }

    return {
      userId: payload.sub as string,
      email: payload.email as string,
      provider: payload.provider as string,
      issuedAt: payload.iat as number,
      expiresAt: payload.exp as number,
      lastActiveAt,
    };
  } catch {
    return null;
  }
}

/**
 * Returns true if the session's lastActiveAt is old enough to warrant
 * re-issuing the token with a fresh timestamp (sliding window).
 */
export function shouldRefreshSession(session: AuthSession): boolean {
  const nowSecs = Math.floor(Date.now() / 1000);
  return nowSecs - session.lastActiveAt > REFRESH_THRESHOLD_SECS;
}

/** The cookie name used for the session token. */
export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

/**
 * Append a Set-Cookie header that stores the session JWT.
 */
export function setSessionCookie(
  headers: Headers,
  token: string,
  maxAgeDays: number,
): void {
  const maxAgeSecs = maxAgeDays * 24 * 60 * 60;
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSecs}; Secure`,
  );
}

/**
 * Append a Set-Cookie header that immediately clears the session cookie.
 */
export function clearSessionCookie(headers: Headers): void {
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`,
  );
}

/**
 * Read the raw JWT string from the request's Cookie header.
 * Returns null if the cookie is absent.
 */
export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === COOKIE_NAME) {
      return rest.join("=") || null;
    }
  }
  return null;
}
