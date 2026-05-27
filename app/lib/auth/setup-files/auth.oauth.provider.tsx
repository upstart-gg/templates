import type { LoaderFunctionArgs, RouterContextProvider } from "react-router";
import { handleOAuthInitiate } from "~/lib/auth/actions/oauth.server";

export async function loader({
  params,
  request,
  context,
}: LoaderFunctionArgs<RouterContextProvider>) {
  return handleOAuthInitiate(params.provider as string, request, context);
}
