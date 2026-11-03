import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { db } from "./db";
import { sendEmail } from "./email";
import { env } from "./env";

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (env.oauth.googleId && env.oauth.googleSecret) socialProviders.google = { clientId: env.oauth.googleId, clientSecret: env.oauth.googleSecret };
if (env.oauth.githubId && env.oauth.githubSecret) socialProviders.github = { clientId: env.oauth.githubId, clientSecret: env.oauth.githubSecret };

export const enabledSocialProviders = Object.keys(socialProviders) as ("google" | "github")[];

/**
 * Founder bootstrap: an account whose email is in ADMIN_EMAILS becomes admin only once
 * that email is verified (by email link or a verified OAuth email). Someone who signs up
 * with your address first can never verify it, so they never become admin.
 */
async function promoteFounder(user: { id: string; email: string; emailVerified: boolean; role?: unknown }) {
  if (!user.emailVerified || user.role === "admin") return;
  if (!env.adminEmails.includes(user.email.toLowerCase())) return;
  await db.user.update({ where: { id: user.id }, data: { role: "admin" } });
}

export const auth = betterAuth({
  appName: "PortfolioHub",
  baseURL: env.appUrl,
  secret: env.authSecret || undefined,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: false, // sign-in allowed; publishing requires a verified email (see publish service)
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, "Reset your PortfolioHub password", `Reset your password: ${url}\n\nIf you didn't ask for this, ignore this email.`);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, "Verify your email for PortfolioHub", `Confirm your email to publish your portfolio: ${url}`);
    },
  },
  socialProviders,
  databaseHooks: {
    user: {
      create: { after: async (user) => promoteFounder(user) },
      update: { after: async (user) => promoteFounder(user) },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 300, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 6 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: env.isProd,
  },
  plugins: [
    // Roles live in the database; nobody can grant themselves "admin" through the API
    // because only existing admins may call setRole, and `role` is not a user input field.
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    twoFactor({ issuer: "PortfolioHub" }),
    nextCookies(), // must be last
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
