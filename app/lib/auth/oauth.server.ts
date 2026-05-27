import * as arctic from "arctic";
import type { OAuthProviderConfig } from "./config";

// ---------------------------------------------------------------------------
// Cookie names for temporary OAuth state storage
// ---------------------------------------------------------------------------

const STATE_COOKIE = "__oauth_state";
const CODE_VERIFIER_COOKIE = "__oauth_cv";
const OAUTH_COOKIE_MAX_AGE = 60 * 10; // 10 minutes

// ---------------------------------------------------------------------------
// Unified provider wrapper
//
// Arctic v3 has two provider shapes:
//   - PKCE providers: createAuthorizationURL(state, codeVerifier, scopes?)
//                     validateAuthorizationCode(code, codeVerifier)
//   - State-only providers: createAuthorizationURL(state, scopes?)
//                            validateAuthorizationCode(code)
//
// We normalise both into a single ProviderWrapper so the rest of the code
// doesn't need to branch on the provider type.
// ---------------------------------------------------------------------------

export type ProviderWrapper = {
  /** Whether this provider uses PKCE (codeVerifier). */
  usesPkce: boolean;
  createAuthorizationURL(
    state: string,
    codeVerifier: string,
    scopes: string[],
  ): Promise<URL>;
  validateAuthorizationCode(
    code: string,
    codeVerifier: string,
  ): Promise<arctic.OAuth2Tokens>;
};

function wrapPkce(provider: {
  createAuthorizationURL(
    state: string,
    codeVerifier: string,
    scopes?: string[],
  ): URL | Promise<URL>;
  validateAuthorizationCode(
    code: string,
    codeVerifier: string,
  ): Promise<arctic.OAuth2Tokens>;
}): ProviderWrapper {
  return {
    usesPkce: true,
    async createAuthorizationURL(state, codeVerifier, scopes) {
      return provider.createAuthorizationURL(state, codeVerifier, scopes);
    },
    validateAuthorizationCode(code, codeVerifier) {
      return provider.validateAuthorizationCode(code, codeVerifier);
    },
  };
}

function wrapStateOnly(provider: {
  createAuthorizationURL(state: string, scopes?: string[]): URL | Promise<URL>;
  validateAuthorizationCode(code: string): Promise<arctic.OAuth2Tokens>;
}): ProviderWrapper {
  return {
    usesPkce: false,
    async createAuthorizationURL(state, _codeVerifier, scopes) {
      return provider.createAuthorizationURL(state, scopes);
    },
    validateAuthorizationCode(code, _codeVerifier) {
      return provider.validateAuthorizationCode(code);
    },
  };
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

/**
 * Create an Arctic OAuth provider wrapper from a provider config and env.
 *
 * @param providerConfig - The provider entry from auth.json
 * @param env - The process environment (process.env or CF Workers env object)
 * @param redirectUri - The full callback URL for this provider
 */
export function createProvider(
  providerConfig: OAuthProviderConfig,
  env: Record<string, string | undefined>,
  redirectUri: string,
): ProviderWrapper {
  const clientId = env[providerConfig.clientIdEnvVar];
  const clientSecret = env[providerConfig.clientSecretEnvVar];

  if (!clientId) {
    throw new Error(
      `Missing env var "${providerConfig.clientIdEnvVar}" for OAuth provider "${providerConfig.id}"`,
    );
  }
  if (!clientSecret) {
    throw new Error(
      `Missing env var "${providerConfig.clientSecretEnvVar}" for OAuth provider "${providerConfig.id}"`,
    );
  }

  const params = providerConfig.paramsEnvVars ?? {};

  function param(key: string, required = true): string {
    const envVar = params[key];
    if (!envVar) {
      if (required) {
        throw new Error(
          `Provider "${providerConfig.id}" requires a paramsEnvVars entry for "${key}"`,
        );
      }
      return "";
    }
    const value = env[envVar];
    if (!value && required) {
      throw new Error(
        `Missing env var "${envVar}" (required for "${providerConfig.id}" param "${key}")`,
      );
    }
    return value ?? "";
  }

  const id = providerConfig.id;

  switch (id) {
    case "google":
      return wrapPkce(new arctic.Google(clientId, clientSecret, redirectUri));

    case "github":
      return wrapStateOnly(
        new arctic.GitHub(clientId, clientSecret, redirectUri),
      );

    case "discord":
      return wrapPkce(new arctic.Discord(clientId, clientSecret, redirectUri));

    case "microsoft": {
      const tenant = param("tenant");
      return wrapPkce(
        new arctic.MicrosoftEntraId(
          tenant,
          clientId,
          clientSecret,
          redirectUri,
        ),
      );
    }

    case "apple": {
      const teamId = param("teamId");
      const keyId = param("keyId");
      const privateKeyStr = param("privateKey");
      const privateKey = new TextEncoder().encode(privateKeyStr);
      return wrapStateOnly(
        new arctic.Apple(clientId, teamId, keyId, privateKey, redirectUri),
      );
    }

    case "facebook":
      return wrapStateOnly(
        new arctic.Facebook(clientId, clientSecret, redirectUri),
      );

    case "twitter":
      return wrapPkce(new arctic.Twitter(clientId, clientSecret, redirectUri));

    case "linkedin":
      return wrapStateOnly(
        new arctic.LinkedIn(clientId, clientSecret, redirectUri),
      );

    case "gitlab": {
      const baseUrl = params.baseUrl
        ? (env[params.baseUrl] ?? "https://gitlab.com")
        : "https://gitlab.com";
      return wrapStateOnly(
        new arctic.GitLab(baseUrl, clientId, clientSecret, redirectUri),
      );
    }

    case "okta": {
      const domain = param("domain");
      const authorizationServerId = params.authorizationServerId
        ? (env[params.authorizationServerId] ?? "default")
        : "default";
      return wrapPkce(
        new arctic.Okta(
          domain,
          authorizationServerId,
          clientId,
          clientSecret,
          redirectUri,
        ),
      );
    }

    case "keycloak": {
      const realmUrl = param("realmUrl");
      return wrapPkce(
        new arctic.KeyCloak(realmUrl, clientId, clientSecret, redirectUri),
      );
    }

    case "auth0": {
      const domain = param("domain");
      return wrapPkce(
        new arctic.Auth0(domain, clientId, clientSecret, redirectUri),
      );
    }

    case "salesforce": {
      const domain = param("domain");
      return wrapPkce(
        new arctic.Salesforce(domain, clientId, clientSecret, redirectUri),
      );
    }

    case "atlassian":
      return wrapStateOnly(
        new arctic.Atlassian(clientId, clientSecret, redirectUri),
      );

    case "mastodon": {
      const baseUrl = param("baseUrl");
      return wrapPkce(
        new arctic.Mastodon(baseUrl, clientId, clientSecret, redirectUri),
      );
    }

    case "notion":
      return wrapPkce(new arctic.Notion(clientId, clientSecret, redirectUri));

    case "workos":
      return wrapPkce(new arctic.WorkOS(clientId, clientSecret, redirectUri));

    case "cognito": {
      const domain = param("domain");
      return wrapPkce(
        new arctic.AmazonCognito(domain, clientId, clientSecret, redirectUri),
      );
    }

    default:
      throw new Error(`Unsupported OAuth provider: "${id}"`);
  }
}

// ---------------------------------------------------------------------------
// Authorization URL generation
// ---------------------------------------------------------------------------

/**
 * Generate an authorization URL.
 * For PKCE providers a codeVerifier is generated; for state-only providers
 * codeVerifier is an empty string (ignored during token exchange).
 */
export async function generateAuthorizationUrl(
  provider: ProviderWrapper,
  providerId: string,
): Promise<{ url: URL; state: string; codeVerifier: string }> {
  const state = arctic.generateState();
  const codeVerifier = provider.usesPkce ? arctic.generateCodeVerifier() : "";
  const scopes = getDefaultScopes(providerId);
  const url = await provider.createAuthorizationURL(
    state,
    codeVerifier,
    scopes,
  );
  return { url, state, codeVerifier };
}

/** Default OAuth scopes per provider — enough to fetch the user's email. */
function getDefaultScopes(providerId: string): string[] {
  switch (providerId) {
    case "google":
      return ["openid", "profile", "email"];
    case "github":
      return ["user:email"];
    case "discord":
      return ["identify", "email"];
    case "microsoft":
      return ["openid", "profile", "email"];
    case "apple":
      return ["name", "email"];
    case "facebook":
      return ["email", "public_profile"];
    case "twitter":
      return ["users.read", "tweet.read"];
    case "linkedin":
      return ["openid", "profile", "email"];
    case "gitlab":
      return ["read_user"];
    case "okta":
    case "keycloak":
    case "auth0":
    case "workos":
    case "cognito":
      return ["openid", "profile", "email"];
    case "salesforce":
      return ["openid", "profile", "email"];
    case "atlassian":
      return ["read:me"];
    case "mastodon":
      return ["read:accounts"];
    case "notion":
      return [];
    default:
      return ["openid", "profile", "email"];
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers for OAuth state (temporary, short-lived)
// ---------------------------------------------------------------------------

export function setOAuthCookies(
  headers: Headers,
  state: string,
  codeVerifier: string,
): void {
  const opts = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${OAUTH_COOKIE_MAX_AGE}; Secure`;
  headers.append("Set-Cookie", `${STATE_COOKIE}=${state}; ${opts}`);
  headers.append(
    "Set-Cookie",
    `${CODE_VERIFIER_COOKIE}=${codeVerifier}; ${opts}`,
  );
}

export function clearOAuthCookies(headers: Headers): void {
  const opts = "Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure";
  headers.append("Set-Cookie", `${STATE_COOKIE}=; ${opts}`);
  headers.append("Set-Cookie", `${CODE_VERIFIER_COOKIE}=; ${opts}`);
}

export function getOAuthCookies(request: Request): {
  state: string | null;
  codeVerifier: string | null;
} {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const map: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) map[k] = v.join("=");
  }
  return {
    state: map[STATE_COOKIE] ?? null,
    codeVerifier: map[CODE_VERIFIER_COOKIE] ?? null,
  };
}

// ---------------------------------------------------------------------------
// User profile fetching — normalise each provider's response to { email, id }
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's email and provider-specific ID.
 * Uses the access token returned by the provider after code exchange.
 */
export async function fetchUserProfile(
  providerId: string,
  tokens: arctic.OAuth2Tokens,
): Promise<{ email: string; id: string }> {
  const accessToken = tokens.accessToken();

  switch (providerId) {
    case "google": {
      const res = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = (await res.json()) as { email: string; sub: string };
      return { email: data.email, id: data.sub };
    }

    case "github": {
      const res = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      const emails = (await res.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = emails.find((e) => e.primary && e.verified);
      if (!primary) throw new Error("GitHub: no verified primary email found");

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      const user = (await userRes.json()) as { id: number };
      return { email: primary.email, id: String(user.id) };
    }

    case "discord": {
      const res = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as { id: string; email: string };
      return { email: data.email, id: data.id };
    }

    case "microsoft": {
      const res = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as {
        id: string;
        mail: string;
        userPrincipalName: string;
      };
      return { email: data.mail ?? data.userPrincipalName, id: data.id };
    }

    case "apple": {
      // Apple returns user info in the id_token on first login only.
      const idToken = tokens.idToken();
      const [, payloadB64] = idToken.split(".");
      const payload = JSON.parse(atob(payloadB64)) as {
        sub: string;
        email: string;
      };
      return { email: payload.email, id: payload.sub };
    }

    case "facebook": {
      const res = await fetch(
        `https://graph.facebook.com/me?fields=id,email&access_token=${accessToken}`,
      );
      const data = (await res.json()) as { id: string; email: string };
      return { email: data.email, id: data.id };
    }

    case "twitter": {
      // Twitter/X requires "Request email address from users" permission enabled in the app.
      const res = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=id",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = (await res.json()) as { data: { id: string } };
      throw new Error(
        "Twitter/X: email is not available via the standard API. " +
          "Enable 'Request email address from users' in your Twitter App settings and implement a custom email-fetch step. " +
          `User id: ${data.data?.id}`,
      );
    }

    case "linkedin": {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as { sub: string; email: string };
      return { email: data.email, id: data.sub };
    }

    case "gitlab": {
      const res = await fetch("https://gitlab.com/oauth/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as { sub: string; email: string };
      return { email: data.email, id: data.sub };
    }

    case "okta":
    case "keycloak":
    case "auth0":
    case "cognito":
    case "workos": {
      // OIDC-compliant: decode the id_token
      const idToken = tokens.idToken();
      const [, payloadB64] = idToken.split(".");
      const payload = JSON.parse(atob(payloadB64)) as {
        sub: string;
        email: string;
      };
      return { email: payload.email, id: payload.sub };
    }

    case "salesforce": {
      // Salesforce includes an identity URL in the token response
      const idUrl = (tokens as unknown as Record<string, unknown>)?.id as
        | string
        | undefined;
      if (!idUrl)
        throw new Error("Salesforce: missing identity URL in token response");
      const res = await fetch(idUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as { user_id: string; email: string };
      return { email: data.email, id: data.user_id };
    }

    case "atlassian": {
      const res = await fetch("https://api.atlassian.com/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as { account_id: string; email: string };
      return { email: data.email, id: data.account_id };
    }

    case "mastodon": {
      // Mastodon does not expose email — use `acct` (username@instance) as the identifier.
      // The instance base URL is not available here; using the token's server if discoverable.
      // For a real implementation the caller should pass the baseUrl from provider config.
      const res = await fetch(
        "https://mastodon.social/api/v1/accounts/verify_credentials",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = (await res.json()) as { id: string; acct: string };
      return { email: data.acct, id: data.id };
    }

    case "notion": {
      const res = await fetch("https://api.notion.com/v1/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2022-06-28",
        },
      });
      const data = (await res.json()) as {
        id: string;
        person?: { email?: string };
        bot?: { owner?: { user?: { person?: { email?: string } } } };
      };
      const email =
        data.person?.email ?? data.bot?.owner?.user?.person?.email ?? "";
      if (!email)
        throw new Error("Notion: unable to retrieve email from user profile");
      return { email, id: data.id };
    }

    default:
      throw new Error(`fetchUserProfile: unsupported provider "${providerId}"`);
  }
}
