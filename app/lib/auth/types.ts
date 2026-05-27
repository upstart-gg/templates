/**
 * The decoded session payload stored in the JWT cookie.
 * Times are Unix timestamps in seconds.
 */
export type AuthSession = {
  /** The auth_users.$id of the authenticated user */
  userId: string;
  /** User's email address */
  email: string;
  /** OAuth provider id used to authenticate (e.g. 'google') */
  provider: string;
  /** Token issued-at time (Unix seconds) */
  issuedAt: number;
  /** Token hard-expiry time (Unix seconds) */
  expiresAt: number;
  /** Last time the session was actively used (Unix seconds) — used for inactivity timeout */
  lastActiveAt: number;
};
