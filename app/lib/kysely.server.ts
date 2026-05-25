/**
 * This is the kysely client for datasource - DO NOT MODIFY MANUALLY
 */
import { createKyselyDatasourceClient } from "@upstart.gg/sdk/kysely";
import type { DB } from "~/.internal/db-schema";

export { sql } from "kysely";

export function getKyselyClient() {
  // The D1 driver reads from the cloudflare:workers env binding (both dev via
  // miniflare and production). No path argument needed.
  return createKyselyDatasourceClient<DB>();
}
