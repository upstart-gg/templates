import { redirect } from "react-router";
import { buildSignOutHeaders } from "~/lib/auth/actions/sign-out.server";

export async function action() {
  return redirect("/", { headers: buildSignOutHeaders() });
}

export async function loader() {
  return redirect("/", { headers: buildSignOutHeaders() });
}
