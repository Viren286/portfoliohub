/**
 * Steps 3 and 5: work out which sections exist and apply customization.
 *
 * Templates only ever iterate `vm.sections`, which contains exclusively sections
 * that have data and are not hidden. That is what guarantees "no empty headings".
 */
import type { CleanData, Link } from "./normalize";
import { SECTION_KEYS, type Customization, type FontKey, type ResolvedCustomization, type SectionKey } from "./schema";

export const SECTION_TITLES: Record<SectionKey, string> = {
  about: "About",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  awards: "Awards & Achievements",
  publications: "Publications",
  positions: "Positions of Responsibility",
  extracurriculars: "Extracurricular Activities",
  volunteering: "Volunteer Work",
  testimonials: "Testimonials",
  hobbies: "Hobbies & Interests",
  contact: "Contact",
};

export const FONTS: Record<FontKey, { label: string; stack: string; google?: string }> = {
  inter: { label: "Inter", stack: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif", google: "Inter:wght@400;500;600;700;800" },
  "space-grotesk": { label: "Space Grotesk", stack: "'Space Grotesk', system-ui, sans-serif", google: "Space+Grotesk:wght@400;500;600;700" },
  fraunces: { label: "Fraunces", stack: "'Fraunces', Georgia, 'Times New Roman', serif", google: "Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800" },
  playfair: { label: "Playfair Display", stack: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@400;600;800" },
  jetbrains: { label: "JetBrains Mono", stack: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace", google: "JetBrains+Mono:wght@400;500;700" },
  "dm-sans": { label: "DM Sans", stack: "'DM Sans', system-ui, sans-serif", google: "DM+Sans:wght@400;500;700" },
  system: { label: "System", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
};

export const BASE_DEFAULTS: ResolvedCustomization = {
  primaryColor: "#2563EB",
  secondaryColor: "#0F172A",
  font: "inter",
  headingFont: "inter",
  mode: "light",
  background: "plain",
  cardStyle: "bordered",
  animation: "subtle",
  showAvatar: true,
  showSocials: true,
  sectionOrder: [...SECTION_KEYS],
  hiddenSections: [],
};

export interface Section {
  key: SectionKey;
  title: string;
  index: number; // 1-based, in display order
}

export interface IconLink extends Link {
  icon: "github" | "linkedin" | "mail" | "link" | "phone";
}

export interface ViewModel {
  data: CleanData;
  c: ResolvedCustomization;
  sections: Section[];
  has: (key: SectionKey) => boolean;
  name: string;
  firstName: string;
  initials: string;
  intro?: string;
  links: IconLink[];
  colors: { primary: string; onPrimary: string; secondary: string };
  fonts: { body: (typeof FONTS)[FontKey]; heading: (typeof FONTS)[FontKey] };
  branding: { show: boolean; url: string; label: string };
  mode: "preview" | "publish";
  siteUrl?: string;
}

function hasContent(d: CleanData, key: SectionKey, links: IconLink[]): boolean {
  switch (key) {
    case "about":
      return !!d.personal.about;
    case "contact":
      return !!(d.personal.email || d.personal.phone || links.length);
    case "hobbies":
      return d.hobbies.length > 0;
    default:
      return (d[key] as unknown[]).length > 0;
  }
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function readableOn(hex: string): string {
  return luminance(hex) > 0.4 ? "#0B0B0C" : "#FFFFFF";
}

export function resolveCustomization(
  input: Customization | undefined,
  templateDefaults: Partial<ResolvedCustomization>,
): ResolvedCustomization {
  const base = { ...BASE_DEFAULTS, ...templateDefaults };
  const c = { ...base, ...Object.fromEntries(Object.entries(input ?? {}).filter(([, v]) => v !== undefined && v !== "")) };
  const preferred = (c.sectionOrder ?? []).filter((k, i, arr) => SECTION_KEYS.includes(k) && arr.indexOf(k) === i);
  const order = [...preferred, ...base.sectionOrder.filter((k) => !preferred.includes(k)), ...SECTION_KEYS.filter((k) => !preferred.includes(k) && !base.sectionOrder.includes(k))];
  return { ...c, sectionOrder: order, hiddenSections: c.hiddenSections ?? [] } as ResolvedCustomization;
}

export function buildViewModel(
  data: CleanData,
  c: ResolvedCustomization,
  opts: { mode: "preview" | "publish"; showBranding: boolean; appUrl: string; siteUrl?: string },
): ViewModel {
  const p = data.personal;
  const links: IconLink[] = [];
  if (c.showSocials) {
    if (p.githubUrl) links.push({ label: "GitHub", url: p.githubUrl, icon: "github" });
    if (p.linkedinUrl) links.push({ label: "LinkedIn", url: p.linkedinUrl, icon: "linkedin" });
    for (const s of p.socials) links.push({ ...s, icon: "link" });
  }
  if (p.email) links.push({ label: "Email", url: `mailto:${p.email}`, icon: "mail" });

  const visible = c.sectionOrder.filter((k) => !c.hiddenSections.includes(k) && hasContent(data, k, links));
  const sections = visible.map((key, i) => ({ key, title: SECTION_TITLES[key], index: i + 1 }));
  const words = p.fullName.split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase() || "?";

  return {
    data,
    c,
    sections,
    has: (k) => visible.includes(k),
    name: p.fullName,
    firstName: words[0] ?? p.fullName,
    initials,
    intro: c.introText?.trim() || p.headline,
    links,
    colors: { primary: c.primaryColor, onPrimary: readableOn(c.primaryColor), secondary: c.secondaryColor },
    fonts: { body: FONTS[c.font], heading: FONTS[c.headingFont] },
    branding: { show: opts.showBranding, url: opts.appUrl, label: "Made with PortfolioHub" },
    mode: opts.mode,
    siteUrl: opts.siteUrl,
  };
}

// ---------------------------------------------------------------- formatting helpers

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtMonth(iso?: string): string {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function fmtRange(start?: string, end?: string, current?: boolean): string {
  const a = fmtMonth(start);
  const b = current ? "Present" : fmtMonth(end);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

export function fmtYears(start?: number, end?: number): string {
  if (start && end) return `${start} – ${end}`;
  return String(end ?? start ?? "");
}

export function hostOf(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "mailto:") return u.pathname;
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")).slice(0, 48);
  } catch {
    return url;
  }
}
