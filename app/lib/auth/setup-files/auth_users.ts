import { defineDatasource } from "@upstart.gg/sdk/datasources";
import { z } from "zod";

export const authUsersDatasource = defineDatasource({
  id: "auth_users",
  provider: "internal",
  label: "Auth Users",
  hidden: true,
  labelBy: "email",
  schema: z.object({
    email: z.email().describe("User email address"),
    oauth_provider: z.string().describe("OAuth provider id, e.g. 'google'"),
    oauth_provider_id: z.string().describe("User id from the OAuth provider"),
  }),
  indexes: [
    { name: "idx_email", fields: ["email"], unique: true },
    {
      name: "idx_oauth",
      fields: ["oauth_provider", "oauth_provider_id"],
      unique: true,
    },
  ],
});

export default authUsersDatasource;
