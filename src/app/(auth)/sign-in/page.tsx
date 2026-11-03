import { Suspense } from "react";
import { redirect } from "next/navigation";
import { enabledSocialProviders } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { SignInForm } from "../auth-forms";

export const metadata = { title: "Sign in" };

export default async function Page() {
  if (await getSession()) redirect("/dashboard");
  return (
    <Suspense>
      <SignInForm providers={enabledSocialProviders} />
    </Suspense>
  );
}
