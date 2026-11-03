/**
 * The portfolio generation engine.
 *
 *   generatePortfolio(userData, templateSlug, customization, options)
 *
 * Plain, deterministic TypeScript: the same parameters always produce the same
 * site. Each step lives in its own module; this file only coordinates them.
 */
import { buildBundle } from "./bundle";
import type { BundleFile, Deployer } from "./deployers/types";
import { normalize } from "./normalize";
import { renderDocument } from "./render";
import { CustomizationSchema, PortfolioDataSchema, type Customization, type PortfolioData } from "./schema";
import { buildSeo } from "./seo";
import { buildViewModel, resolveCustomization, type ViewModel } from "./view-model";
import { getTemplate } from "@/templates";

export class EngineError extends Error {
  constructor(
    public code: "INVALID_DATA" | "INVALID_CUSTOMIZATION" | "UNKNOWN_TEMPLATE" | "MISSING_NAME" | "DEPLOY_FAILED",
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export interface RenderOptions {
  mode: "preview" | "publish";
  appUrl: string;
  siteUrl?: string;
  showBranding: boolean;
}

/** Steps 1–7: validate, normalize, detect sections, pick template, build view model, render HTML. */
export function renderPortfolio(
  userData: PortfolioData,
  templateSlug: string,
  customization: Customization | undefined,
  opts: RenderOptions,
): { html: string; vm: ViewModel; seo: ReturnType<typeof buildSeo> } {
  const parsed = PortfolioDataSchema.safeParse(userData);
  if (!parsed.success) throw new EngineError("INVALID_DATA", "Portfolio data failed validation", parsed.error.issues);
  const custom = CustomizationSchema.safeParse(customization ?? {});
  if (!custom.success) throw new EngineError("INVALID_CUSTOMIZATION", "Customization failed validation", custom.error.issues);

  const template = getTemplate(templateSlug);
  if (!template) throw new EngineError("UNKNOWN_TEMPLATE", `Unknown template "${templateSlug}"`);

  const data = normalize(parsed.data);
  if (!data.personal.fullName) throw new EngineError("MISSING_NAME", "A full name is required to generate a portfolio");

  const resolved = resolveCustomization(custom.data, template.defaults);
  const vm = buildViewModel(data, resolved, opts);
  const seo = buildSeo(vm);
  return { html: renderDocument(template, vm, seo), vm, seo };
}

export interface GenerateOptions {
  portfolioId: string;
  deploymentId: string;
  slug: string;
  customDomain?: string | null;
  appUrl: string;
  showBranding: boolean;
  deployer: Deployer;
  onStage?: (stage: "RENDERING" | "UPLOADING") => Promise<void> | void;
  now?: Date;
}

export interface GenerateResult {
  url: string;
  deploymentId: string;
  status: "LIVE";
  storagePrefix: string;
  fileCount: number;
  totalBytes: number;
  snapshot: ViewModel["data"];
  files: Pick<BundleFile, "path" | "contentType">[];
}

/** Steps 1–12: build the site and deploy it. Returns the live URL and deployment details. */
export async function generatePortfolio(
  userData: PortfolioData,
  templateSlug: string,
  customization: Customization | undefined,
  options: GenerateOptions,
): Promise<GenerateResult> {
  await options.onStage?.("RENDERING");
  const siteUrl = options.deployer.siteUrl(options.slug, options.customDomain);
  const { html, vm } = renderPortfolio(userData, templateSlug, customization, {
    mode: "publish",
    appUrl: options.appUrl,
    siteUrl,
    showBranding: options.showBranding,
  });
  const files = await buildBundle(html, vm, options.now ?? new Date());

  await options.onStage?.("UPLOADING");
  try {
    const res = await options.deployer.publish({
      portfolioId: options.portfolioId,
      deploymentId: options.deploymentId,
      slug: options.slug,
      customDomain: options.customDomain,
      files,
    });
    return {
      url: res.url,
      deploymentId: options.deploymentId,
      status: "LIVE",
      storagePrefix: res.storagePrefix,
      fileCount: res.fileCount,
      totalBytes: res.totalBytes,
      snapshot: vm.data,
      files: files.map(({ path, contentType }) => ({ path, contentType })),
    };
  } catch (e) {
    throw new EngineError("DEPLOY_FAILED", e instanceof Error ? e.message : "Deployment failed");
  }
}
