import { Suspense } from "react";
import { ResetForm } from "../auth-forms";

export const metadata = { title: "Choose a new password" };

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
