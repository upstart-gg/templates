 type AppEnv = import("./app/.internal/env.context").Env
 declare module "react-router" {
  interface RouterContextProvider {
      env: AppEnv;
  }
}

// Also set Node.js process env type to AppEnv for better type safety when accessing env vars in code
declare global {
  namespace NodeJS {
    interface ProcessEnv extends AppEnv {}
  }

  // Installed by the sandbox host (apps/sandbox) to inject per-request env
  // overrides via AsyncLocalStorage. Undefined when running in any other
  // environment (Cloudflare Worker, standalone Node dev).
  var __upstartGetRequestEnv: (() => Record<string, string | undefined> | undefined) | undefined;
}

export {};
