import type { StoreUploadContext } from "@upstart.gg/sdk/utils/upload";
import type { BucketLike } from "@upstart.gg/sdk/utils/storage/bucket";
import type { RouterContextProvider } from "react-router";
import type { CloudflareContext, Env } from "~/.internal/env.context";
import { cloudflareContext, envContext } from "~/.internal/env.context";
import process from "node:process";

function isProductionLikeEnv(env: string | undefined): boolean {
  return env === "production" || env === "preview";
}

/**
 * Expected worker contract:
 * - Binding name: `UPLOADS_BUCKET`
 * - Type: Cloudflare R2 bucket binding
 * - Environment variable: `UP_UPLOADS_BASE_URL` containing the public base URL for uploaded files (e.g. `https://abc123-uploads.upstart.gg`)
 *
 * This function extracts the necessary information from the worker context and validates it, throwing helpful errors if the expected contract is not met.
 */
export function getUploadsContext(
  context: RouterContextProvider | Readonly<RouterContextProvider>,
): StoreUploadContext {
  const runtimeEnv = context.get(envContext) as Env;
  const flippableEnv = runtimeEnv.FLIPPABLE_ENV ?? process.env.FLIPPABLE_ENV;
  const isProductionLike = isProductionLikeEnv(flippableEnv);

  const runtimeCloudflareContext = context.get(
    cloudflareContext,
  ) as CloudflareContext;
  const maybeBinding = runtimeCloudflareContext?.env?.UPLOADS_BUCKET;
  if ((!maybeBinding || typeof maybeBinding !== "object") && isProductionLike) {
    throw new Error(
      `Missing worker binding "UPLOADS_BUCKET" in context.cloudflare.env`,
    );
  }

  const maybeBucket = maybeBinding as { put?: unknown } | undefined;
  if (maybeBucket && typeof maybeBucket.put !== "function") {
    throw new Error(
      `Invalid worker binding "UPLOADS_BUCKET": missing put() method`,
    );
  }

  const publicBaseUrl =
    runtimeEnv.UP_UPLOADS_BASE_URL || process.env.UP_UPLOADS_BASE_URL || "";
  if (typeof publicBaseUrl !== "string") {
    throw new Error(
      'Missing environment variable "UP_UPLOADS_BASE_URL" in env context',
    );
  }

  const fallbackLocalBucket: BucketLike = {
    put: async () => undefined,
  };

  return {
    bucket: (maybeBucket?.put
      ? maybeBinding
      : fallbackLocalBucket) as BucketLike,
    publicBaseUrl,
  };
}
