import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type RouterContextProvider,
  type LoaderFunctionArgs,
  type MiddlewareFunction,
  data,
} from "react-router";
import type { Route } from "./+types/root";
import "./config/.internal/design-system.css";
import "./app.css";
import { siteContextMiddleware } from "./middlewares/env";
import { envContext } from "./.internal/env.context";
import {
  getLocale,
  i18nextMiddleware,
  localeCookie,
} from "~/middlewares/i18next";
import siteConfig from "./config/site.json" with { type: "json" };
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import type { SiteAttributes } from "@upstart.gg/sdk";

// Here we use "any" because it litteraly can contains various types of middlewares (for env, i18next, auth, etc.) and we don't want to be too strict on the type of the context they use, as it can vary a lot between middlewares. The important part is that they are MiddlewareFunction, which ensures they have the correct signature for react-router middlewares.
// biome-ignore lint/suspicious/noExplicitAny: We want to allow any type of middleware context
export const middleware: MiddlewareFunction<any>[] = [
  siteContextMiddleware,
  i18nextMiddleware,
];

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  // favicon
  { rel: "icon", href: "/favicon.ico" },
  // Don't remove this line, it's used to inject the Tailwind CSS in sandbox mode
  ...(process.env.APP_ENV === "sandbox"
    ? [
        {
          rel: "stylesheet",
          href: "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
        },
      ]
    : []),
];

export async function loader({
  context,
}: LoaderFunctionArgs<RouterContextProvider>) {
  const env = context.get(envContext);
  const locale = getLocale(context);

  return data(
    {
      env,
      locale,
    },
    { headers: { "Set-Cookie": await localeCookie.serialize(locale) } },
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const config = siteConfig as unknown as SiteAttributes;
  return (
    <html
      lang={i18n.language}
      dir={i18n.dir(i18n.language)}
      className="antialiased scroll-smooth"
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="origin-when-cross-origin" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData: { locale } }: Route.ComponentProps) {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (i18n.language !== locale) i18n.changeLanguage(locale);
  }, [locale, i18n]);
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    console.log("is a route error");
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  }

  if (
    (import.meta.env.DEV || process?.env.APP_ENV === "sandbox") &&
    error &&
    error instanceof Error
  ) {
    console.log("Not a route error");
    details = error.message;
    stack = error.stack;
    console.log("error stack", stack);
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
