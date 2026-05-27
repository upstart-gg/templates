import { createContext } from "react-router";

export type Env = {
  UP_SITE_ID: string;
  UP_UPLOADS_BASE_URL: string;
  WORKSPACE?: string;
  WORKSPACE_TMP?: string;
  BASE_URL?: string;
  [key: string]: string | undefined;
};

export const envContext = createContext<Env>({
  UP_SITE_ID: "",
  UP_UPLOADS_BASE_URL: "",
});

// Cloudflare context for worker bindings
export type CloudflareContext = {
  env: Record<string, unknown>;
  ctx: ExecutionContext;
};

export const cloudflareContext = createContext<CloudflareContext>({
  env: {},
  ctx: {} as ExecutionContext,
});
