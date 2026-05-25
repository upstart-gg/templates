import {
  redirect,
  RouterContextProvider,
  type LoaderFunctionArgs,
} from "react-router";
import { handleOAuthCallback } from "~/lib/auth/actions/oauth.server";

export async function loader({
  params,
  request,
  context,
}: LoaderFunctionArgs<RouterContextProvider>) {
  const result = await handleOAuthCallback(
    params.provider as string,
    request,
    context,
  );
  if ("error" in result) throw new Response(result.error, { status: 400 });
  return redirect("/", { headers: result.headers });
}
