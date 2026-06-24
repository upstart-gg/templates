import { envContext, type Env } from "~/.internal/env.context";
import type { MiddlewareFunction } from "react-router";
import process from "node:process";

function getRequestEnv(): NodeJS.ProcessEnv {
  const override = globalThis.__upstartGetRequestEnv?.();
  return override ? { ...process.env, ...override } : process.env;
}

export const siteContextMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const env = getRequestEnv();

  if (env.APP_ENV === "sandbox") {
    const url = new URL(request.url);
    const siteId =
      env.UP_SITE_ID ||
      url.hostname.split(".").filter(Boolean)[0] ||
      "test-site";
    const workspace = env.WORKSPACE ?? `${env.WORKSPACE_BASE}/${siteId}`;

    context.set(envContext, {
      ...env,
      UP_SITE_ID: siteId,
      UP_UPLOADS_BASE_URL: env.UP_UPLOADS_BASE_URL || "",
      WORKSPACE: workspace,
      WORKSPACE_TMP: env.WORKSPACE_TMP ?? `${workspace}/.tmp`,
      BASE_URL: import.meta.env.BASE_URL,
    } satisfies Env);
  } else {
    context.set(envContext, {
      ...env,
      UP_SITE_ID: env.UP_SITE_ID || "",
      UP_UPLOADS_BASE_URL: env.UP_UPLOADS_BASE_URL || "",
      BASE_URL: import.meta.env.BASE_URL,
    } satisfies Env);
  }

  const response = await next();
  return response;
};
