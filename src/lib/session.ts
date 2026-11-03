import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { env } from "./env";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

/** Pages and actions that need a signed-in, non-suspended user. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.banned) redirect("/suspended");
  return session.user;
}

/** The single source of truth for "is this person the founder/admin?" — evaluated on the server only. */
export function isAdminUser(user: Pick<SessionUser, "email" | "role" | "banned" | "emailVerified"> & { twoFactorEnabled?: boolean | null }) {
  const allow = env.adminEmails;
  return (
    user.role === "admin" &&
    user.emailVerified &&
    !user.banned &&
    allow.length > 0 &&
    allow.includes(user.email.toLowerCase())
  );
}

/**
 * Admin guard for pages, route handlers and server actions.
 * Requires: role=admin in the DB, email on ADMIN_EMAILS, and (by default) 2FA enabled.
 * Anything else gets a 404, so the admin area's existence is never revealed.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminUser(user)) notFound();
  if (env.adminRequire2fa && !(user as { twoFactorEnabled?: boolean }).twoFactorEnabled) redirect("/dashboard/settings?need2fa=1");
  return user;
}
