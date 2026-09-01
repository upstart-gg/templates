import { createContext } from "react-router";

export type Env = {
  UP_SITE_ID: string;
  UP_UPLOADS_BASE_URL: string;
  WORKSPACE?: string;
  WORKSPACE_TMP?: string;
  BASE_URL?: string;
  [key: string]: string | undefined;
};

/**
 * SERVER-ONLY. Holds the full runtime environment, secrets included
 * (AUTH_SECRET, OAuth client secrets, …).
 *
 * NEVER return this value — or any part of it you have not explicitly picked —
 * from a loader or action: anything a loader returns is serialized into the
 * HTML sent to the browser. Use `toPublicEnv()` for what the client may see.
 */
export const envContext = createContext<Env>({
  UP_SITE_ID: "",
  UP_UPLOADS_BASE_URL: "",
});

/**
 * Opt-in prefix for site-defined env vars that may reach the browser.
 * Naming a var `PUBLIC_*` is an explicit statement that its value is not a
 * secret — so never use it for API keys, tokens or signing secrets.
 */
export const PUBLIC_ENV_PREFIX = "PUBLIC_";

/** The only env vars allowed to reach the browser. */
export type PublicEnv = {
  UP_SITE_ID: string;
  UP_UPLOADS_BASE_URL: string;
  APP_ENV?: string;
  BASE_URL?: string;
  /** Any site-defined `PUBLIC_*` var. */
  [key: `${typeof PUBLIC_ENV_PREFIX}${string}`]: string | undefined;
};

/**
 * Narrow the server environment down to the vars that are safe to serialize
 * into the page: a fixed set of platform vars, plus anything the site
 * explicitly opted in by naming it `PUBLIC_*`.
 *
 * An allowlist, deliberately: a denylist would leak every new secret by
 * default.
 */
export function toPublicEnv(env: Env): PublicEnv {
  const publicVars: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith(PUBLIC_ENV_PREFIX)) {
      publicVars[name] = value;
    }
  }

  return {
    ...publicVars,
    UP_SITE_ID: env.UP_SITE_ID,
    UP_UPLOADS_BASE_URL: env.UP_UPLOADS_BASE_URL,
    APP_ENV: env.APP_ENV,
    BASE_URL: env.BASE_URL,
  };
}

// Cloudflare context for worker bindings
export type CloudflareContext = {
  env: Record<string, unknown>;
  ctx: ExecutionContext;
};

export const cloudflareContext = createContext<CloudflareContext>({
  env: {},
  ctx: {} as ExecutionContext,
});
