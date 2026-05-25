import { z } from "zod";
import authJson from "~/config/auth.json";

export const oauthProviderConfigSchema = z.object({
  id: z.string().describe("Arctic provider id, e.g. 'google', 'github'"),
  clientIdEnvVar: z
    .string()
    .describe("Name of the ENV var holding the OAuth client ID"),
  clientSecretEnvVar: z
    .string()
    .describe("Name of the ENV var holding the OAuth client secret"),
  /**
   * Extra provider-specific params. Maps param name → ENV var name.
   * E.g. { domain: "AUTH_AUTH0_DOMAIN" } for Auth0.
   */
  paramsEnvVars: z.record(z.string(), z.string()).optional(),
});

export const authConfigSchema = z.object({
  enabled: z.boolean().default(false),
  usersDatasourceId: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .default("auth_users"),
  session: z
    .object({
      maxAgeDays: z.number().default(30),
      inactivityTimeoutMinutes: z.number().optional(),
    })
    .default({
      maxAgeDays: 30,
    }),
  oauth: z
    .object({
      providers: z.array(oauthProviderConfigSchema).default([]),
    })
    .default({ providers: [] }),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
export type OAuthProviderConfig = z.infer<typeof oauthProviderConfigSchema>;

export const authConfig: AuthConfig = authConfigSchema.parse(authJson);

// ---------------------------------------------------------------------------
// Provider metadata — human-readable labels and documentation for extra params
// ---------------------------------------------------------------------------

type ProviderParamMeta = {
  description: string;
};

type ProviderMeta = {
  label: string;
  /** Extra required constructor params beyond clientId/clientSecret/redirectUri */
  requiredParams: Record<string, ProviderParamMeta>;
};

export const PROVIDER_META: Record<string, ProviderMeta> = {
  google: { label: "Google", requiredParams: {} },
  github: { label: "GitHub", requiredParams: {} },
  discord: { label: "Discord", requiredParams: {} },
  microsoft: {
    label: "Microsoft",
    requiredParams: {
      tenant: { description: "Azure AD tenant ID or 'common'" },
    },
  },
  apple: {
    label: "Apple",
    requiredParams: {
      teamId: { description: "Apple developer team ID" },
      keyId: { description: "Apple key ID" },
      privateKey: { description: "PKCS8 private key content" },
    },
  },
  facebook: { label: "Facebook", requiredParams: {} },
  twitter: { label: "Twitter / X", requiredParams: {} },
  linkedin: { label: "LinkedIn", requiredParams: {} },
  gitlab: {
    label: "GitLab",
    requiredParams: {
      baseUrl: { description: "GitLab instance URL (omit for gitlab.com)" },
    },
  },
  okta: {
    label: "Okta",
    requiredParams: {
      domain: { description: "Okta org domain (e.g. your-org.okta.com)" },
      authorizationServerId: {
        description:
          "Authorization server ID (optional, defaults to 'default')",
      },
    },
  },
  keycloak: {
    label: "KeyCloak",
    requiredParams: {
      realmUrl: {
        description:
          "Full realm URL, e.g. https://keycloak.example.com/realms/myrealm",
      },
    },
  },
  auth0: {
    label: "Auth0",
    requiredParams: {
      domain: {
        description: "Auth0 tenant domain, e.g. your-tenant.auth0.com",
      },
    },
  },
  salesforce: {
    label: "Salesforce",
    requiredParams: {
      domain: { description: "Salesforce instance domain" },
    },
  },
  atlassian: { label: "Atlassian", requiredParams: {} },
  mastodon: {
    label: "Mastodon",
    requiredParams: {
      baseUrl: {
        description: "Mastodon instance URL, e.g. https://mastodon.social",
      },
    },
  },
  notion: { label: "Notion", requiredParams: {} },
  workos: { label: "WorkOS", requiredParams: {} },
  cognito: {
    label: "Amazon Cognito",
    requiredParams: {
      domain: { description: "Cognito User Pool domain URL" },
    },
  },
};

/**
 * Returns the site.json `envVars` entries needed for a configured OAuth provider.
 * Useful for generating or validating your site.json envVars declarations.
 *
 * @example
 * const entries = getProviderEnvVarDescriptions({
 *   id: "cognito",
 *   clientIdEnvVar: "AUTH_COGNITO_CLIENT_ID",
 *   clientSecretEnvVar: "AUTH_COGNITO_CLIENT_SECRET",
 *   paramsEnvVars: { domain: "AUTH_COGNITO_DOMAIN" },
 * });
 * // → [
 * //   { name: "AUTH_COGNITO_CLIENT_ID", description: "Amazon Cognito OAuth client ID" },
 * //   { name: "AUTH_COGNITO_CLIENT_SECRET", description: "Amazon Cognito OAuth client secret" },
 * //   { name: "AUTH_COGNITO_DOMAIN", description: "Cognito User Pool domain URL" },
 * // ]
 */
export function getProviderEnvVarDescriptions(
  providerConfig: OAuthProviderConfig,
): Array<{ name: string; description: string }> {
  const meta = PROVIDER_META[providerConfig.id];
  const label = meta?.label ?? providerConfig.id;

  const entries: Array<{ name: string; description: string }> = [
    {
      name: providerConfig.clientIdEnvVar,
      description: `${label} OAuth client ID`,
    },
    {
      name: providerConfig.clientSecretEnvVar,
      description: `${label} OAuth client secret`,
    },
  ];

  for (const [paramKey, envVar] of Object.entries(
    providerConfig.paramsEnvVars ?? {},
  )) {
    const desc =
      meta?.requiredParams[paramKey]?.description ?? `${label} ${paramKey}`;
    entries.push({ name: envVar, description: desc });
  }

  return entries;
}
