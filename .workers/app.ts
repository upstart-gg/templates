import { createRequestHandler, RouterContextProvider } from "react-router";
import { cloudflareContext } from "~/.internal/env.context";

type Env = {
  FLIPPABLE_ENV: string;
  APP_ENV: string;
  ASSETS?: Fetcher;
};

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    // In the sandbox preview-runtime (miniflare), per-site requests are routed
    // directly to this worker by hostname — the asset-worker that normally sits
    // in front in Cloudflare's prod runtime is never invoked. Without this
    // fallthrough, requests for `/assets/*.js` reach React Router and come back
    // as HTML, breaking strict-MIME module loading in the browser.
    // In production, the assets binding is already in front of the worker, so
    // this call only ever fires for paths that genuinely have no static match —
    // a single extra 404 lookup, harmless either way.
    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) return assetRes;
    }

    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
