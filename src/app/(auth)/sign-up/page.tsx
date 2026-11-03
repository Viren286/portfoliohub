import { redirect } from "next/navigation";
import { enabledSocialProviders } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { SignUpForm } from "../auth-forms";

export const metadata = { title: "Create your portfolio" };

export default async function Page() {
  if (await getSession()) redirect("/dashboard");
  return <SignUpForm providers={enabledSocialProviders} />;
}
