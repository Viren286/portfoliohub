import { z } from "zod";

/** Plan limits live in the Plan table as JSON, so pricing can change without a code deploy. */
export const EntitlementsSchema = z.object({
  maxPortfolios: z.number().int(), // -1 = unlimited
  templateTiers: z.array(z.enum(["FREE", "PRO"])),
  allow3D: z.boolean(),
  customDomains: z.boolean(),
  removeBranding: z.boolean(),
  maxDeploysPerDay: z.number().int(), // -1 = unlimited
  maxUploadMb: z.number().int(),
});
export type Entitlements = z.infer<typeof EntitlementsSchema>;

export const DEFAULT_PLANS: Record<"FREE" | "PRO" | "ADMIN", { name: string; pricePaise: number | null; entitlements: Entitlements }> = {
  FREE: {
    name: "Free",
    pricePaise: 0,
    entitlements: { maxPortfolios: 1, templateTiers: ["FREE"], allow3D: false, customDomains: false, removeBranding: false, maxDeploysPerDay: 10, maxUploadMb: 25 },
  },
  PRO: {
    name: "Pro",
    pricePaise: 19900,
    entitlements: { maxPortfolios: 5, templateTiers: ["FREE", "PRO"], allow3D: true, customDomains: true, removeBranding: true, maxDeploysPerDay: 50, maxUploadMb: 500 },
  },
  ADMIN: {
    name: "Admin",
    pricePaise: null,
    entitlements: { maxPortfolios: -1, templateTiers: ["FREE", "PRO"], allow3D: true, customDomains: true, removeBranding: true, maxDeploysPerDay: -1, maxUploadMb: 5000 },
  },
};

