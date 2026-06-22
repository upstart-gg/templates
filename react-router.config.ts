import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  routeDiscovery: { mode: "initial" }, // provide complete manifest at build time, no need to discover routes at runtime
  future: {
    v8_viteEnvironmentApi: true,
    v8_middleware: true,
  },
  appDirectory: "app",
  buildDirectory: "build",
} satisfies Config;
