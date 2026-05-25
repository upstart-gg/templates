import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";
import devtoolsJson from 'vite-plugin-devtools-json';
import upstartTheme from "@upstart.gg/vite-plugins/vite-plugin-upstart-theme";
import upstartAttrs from "@upstart.gg/vite-plugins/vite-plugin-upstart-attrs";
import upstartEditorPlugin from "@upstart.gg/vite-plugins/vite-plugin-upstart-editor/plugin";
import upstartBrandingPlugin from "@upstart.gg/vite-plugins/vite-plugin-upstart-branding/plugin";
import  { type SiteAttributes, siteAttributesSchema } from "@upstart.gg/sdk/site";
import type { Theme } from "@upstart.gg/sdk/themes/theme";
import JSON5 from "json5"
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import z from "zod"

type ParsedPlan = { code: string | null; flags: Record<string, boolean> };
function parsePlan(raw: string | undefined): ParsedPlan {
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      code: typeof parsed?.code === "string" ? parsed.code : null,
      flags: parsed?.flags && typeof parsed.flags === "object" ? parsed.flags : {},
    };
  } catch {
    return { code: null, flags: {} };
  }
}
const plan = parsePlan(process.env.UP_PLAN);

const siteConfig = JSON5.parse(
  readFileSync(join(process.cwd(), 'app/config/site.json'), 'utf-8')
) as SiteAttributes;

// Validate siteConfig
const { error} = siteAttributesSchema.safeParse(siteConfig);
if (error) {
  console.error("Invalid site configuration (site.json):\n%s", z.prettifyError(error));
  process.exit(1);
}

const lightThemePath = join(process.cwd(), `app/config/themes/${siteConfig.themes.light}.json`);

// Check that the light theme file exists
if(!existsSync(lightThemePath)) {
  console.error(`Light theme file not found: ${lightThemePath}\
  Hint: The value of 'themes.light' ("${siteConfig.themes.light}") in app/config/site.json must correspond to an existing theme file in app/config/themes/`);
  process.exit(1);
}

if(siteConfig.themes.dark) {
  const darkThemePath = join(process.cwd(), `app/config/themes/${siteConfig.themes.dark}.json`);
  // Check that the dark theme file exists
  if(!existsSync(darkThemePath)) {
    console.error(`Dark theme file not found: ${darkThemePath}\
    Hint: The value of 'themes.dark' ("${siteConfig.themes.dark}") in app/config/site.json must correspond to an existing theme file in app/config/themes/`);
    process.exit(1);
  }
}

const light = JSON5.parse(
  readFileSync(join(process.cwd(), `app/config/themes/${siteConfig.themes.light}.json`), 'utf-8')
) as Theme;
const dark = siteConfig.themes.dark ? JSON5.parse(
  readFileSync(join(process.cwd(), `app/config/themes/${siteConfig.themes.dark}.json`), 'utf-8')
) as Theme : undefined;


export default defineConfig(({isSsrBuild}) => {
  return {
    clearScreen: false,
    logLevel: 'info',
    envPrefix: ["VITE_", "PUBLIC_"],
    build: {
      manifest: true,
      outDir: "build",
      sourcemap: true,
      rollupOptions: {
        external: ["bun"]
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
     resolve: {
      dedupe: ['react', 'react-dom', 'react-router', 'zod'],
      tsconfigPaths: true
    },
    optimizeDeps: {
      exclude: ["bun", "isbot"],
      // Pre-include common libs the agent reaches for, so the optimizer
      // bundles them at server startup rather than lazily on first render
      // (lazy discovery causes mid-render re-optimize → `full-reload` over
      // HMR → loop).
      include: [
        "motion/react",
        "motion",
        "react-i18next",
        "i18next",
        "@iconify/react",
        "react-day-picker",
        "chart.js",
        "react-chartjs-2",
        "date-fns",
        "react-router",
        "nanoid",
        "@conform-to/react",
      ],
      // Force the optimizer to crawl every app source file at startup so
      // transitive deps the agent imports (which we may not have anticipated
      // in `include`) are discovered up-front in one pass — no mid-render
      // re-optimization, no `full-reload` storm.
      entries: [
        "./app/entry.client.tsx",
        "./app/root.tsx",
        "./app/routes/**/*.{ts,tsx}",
        "./app/components/**/*.{ts,tsx}",
        "./app/middlewares/**/*.ts",
      ],
    },
    // Legacy top-level `ssr.optimizeDeps.include` (not `environments.ssr.*`): the
    // @cloudflare/vite-plugin sets `environments.ssr` itself with build inputs
    // (`rollupOptions.input = { index: VIRTUAL_WORKER_ENTRY }`); declaring
    // `environments.ssr` in user config overrides those inputs and the production
    // build fails with `Expected entry chunk with name "index"`. The legacy `ssr.*`
    // key is rewritten internally to the SSR environment without disturbing build.
    //
    // Only direct deps of template-default are listed — pnpm doesn't hoist transitive
    // SDK deps (lodash-es, chroma-js, @cfworker/json-schema, ultrahtml,
    // ultrahtml/transformers/sanitize, etc.), so Vite can't resolve them from this
    // package's root. Those still get lazily discovered in one batch, which is one
    // reload at worst — acceptable. The deps below are the ones loaded eagerly by
    // entry.server.tsx and every middleware, so missing them caused the cascade.
    ssr: {
      optimizeDeps: {
        include: [
          "react-router",
          "react",
          "react-dom",
          "react/jsx-runtime",
          "react-dom/server",
          "i18next",
          "react-i18next",
          "motion/react",
          "motion",
          "nanoid",
          "@conform-to/react",
          "@iconify/react",
          "react-day-picker",
          "chart.js",
          "react-chartjs-2",
          "date-fns",
        ],
      },
    },
    server: {
      allowedHosts: [".sandbox.upstart.gg", ".sandbox.preview.upstart.gg", ".sandbox.localhost"],
      // Force the SSR optimizer to crawl the request-graph entry points at
      // startup so all deps (react-router, remix-i18next/middleware, react,
      // i18next, ...) are pre-bundled before the first request. Without this,
      // a fresh workspace's first SSR render triggers a mid-render reload
      // that strands modules against an older react-router chunk and produces
      // "No value found for context" / "Cannot read properties of null
      // (reading 'useContext')".
      warmup: {
        ssrFiles: [
          './app/root.tsx',
          './app/entry.server.tsx',
          './app/routes/**/*.{ts,tsx}',
          './app/middlewares/**/*.ts',
        ],
      },
      watch: {
        // git merge --no-ff (used when an agent worktree is merged back into
        // the workspace) writes many tracked files in quick succession. Without
        // a stability window, Vite's SSR optimizer can re-crawl and reload
        // mid-render, leaving react-router holding a stale React module and
        // producing "Cannot read properties of null (reading 'useContext')".
        awaitWriteFinish: {
          stabilityThreshold: 400,
          pollInterval: 50,
        },
        // Ignore non-source state directories that the agent / sandbox tooling
        // writes into continuously. Without these, every TodoUpdate (.tmp/),
        // every CodeAgent edit (.worktrees/), and every Lucerna re-index
        // (.lucerna/) fires a chokidar event, Vite broadcasts `full-reload`
        // over HMR, and the iframe reload-loops at ~10/sec during agent runs.
        ignored: [
          "**/.worktrees/**",
          "**/.tmp/**",
          "**/.lucerna/**",
          "**/.react-router/**",
          "**/.wrangler/**",
          "**/.migrations/**",
          "**/.workers/**",
          "**/build/**",
          "**/logs/**",
          "**/memory/**",
          "**/docs/prd/**",
        ],
      },
    },
    plugins: [
      upstartTheme({
        themes: {
          light,
          dark,
          default: siteConfig.themes.default,
        },
        cssFramework: siteConfig.designSystem,
        outputPath: "./app/config/.internal/upstart.theme.css",
      }) as PluginOption,
      upstartAttrs({
          enabled: process.env.APP_ENV === 'sandbox',
          emitRegistry: isSsrBuild === false,
        }) as PluginOption,
      upstartEditorPlugin({
          enabled: process.env.APP_ENV === 'sandbox',
        }) as PluginOption,
      upstartBrandingPlugin({
          // Branding shows for any plan that does NOT grant removable branding
          // (e.g. free). Missing/unknown UP_PLAN defaults to "branding shows".
          enabled: plan.flags.hasRemovableBranding !== true,
        }) as PluginOption,
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      tailwindcss(),
      reactRouter(),
      devtoolsJson(),
      {
        name: 'on-build-success',
        buildEnd(error) {
          if (!error) {
            console.log(`Build (${this.environment.name}) succeeded!`);
          }
        }
      },
    ]
  }
});
