/**
 * Step 2 of the pipeline: clean the validated input so templates can trust it.
 *
 * - strings are trimmed; empty strings become undefined
 * - URLs get https:// when the scheme is missing; only http, https and mailto survive
 * - list items with no meaningful content are dropped
 * - skills are de-duplicated case-insensitively
 * - experience and education are sorted newest first
 *
 * The output types have no `null`s and every list is an array, so templates never
 * need defensive checks for undefined lists.
 */
import type { ImageRef, PortfolioData } from "./schema";

export type CleanImage = { src: string; srcset?: string; width?: number; height?: number; alt?: string };
export type Link = { label: string; url: string };

export interface CleanData {
  personal: {
    fullName: string;
    headline?: string;
    about?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    socials: Link[];
    avatar?: CleanImage;
    resumeUrl?: string;
  };
  education: {
    institution: string;
    degree?: string;
    major?: string;
    startYear?: number;
    endYear?: number;
    grade?: string;
    coursework: string[];
    achievements: string[];
  }[];
  skills: { category: string; items: string[] }[];
  projects: {
    name: string;
    summary?: string;
    description?: string;
    technologies: string[];
    features: string[];
    contributions?: string;
    category?: string;
    repoUrl?: string;
    liveUrl?: string;
    image?: CleanImage;
    screenshots: CleanImage[];
  }[];
  experience: {
    organization: string;
    title: string;
    employmentType?: string;
    startDate?: string;
    endDate?: string;
    current: boolean;
    responsibilities: string[];
    achievements: string[];
    skills: string[];
  }[];
  certifications: { name: string; issuer?: string; issuedOn?: string; credentialUrl?: string; fileUrl?: string }[];
  awards: Entry[];
  publications: Entry[];
  positions: Entry[];
  extracurriculars: Entry[];
  volunteering: Entry[];
  hobbies: string[];
  testimonials: { quote: string; author: string; role?: string }[];
}
export type Entry = { title: string; subtitle?: string; description?: string; date?: string; url?: string };

export function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\r\n/g, "\n").trim();
  return t.length ? t : undefined;
}

export function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const s = str(item);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/** Returns a safe absolute URL or undefined. Never returns javascript:, data:, etc. */
export function safeUrl(v: unknown): string | undefined {
  let s = str(v);
  if (!s) return undefined;
  if (/\s/.test(s)) return undefined;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    if (s.startsWith("//")) s = "https:" + s;
    else if (s.startsWith("/")) return s; // root-relative asset path (local storage / same-site)
    else s = "https://" + s;
  }
  try {
    const u = new URL(s);
    if (!SAFE_SCHEMES.has(u.protocol)) return undefined;
    if ((u.protocol === "http:" || u.protocol === "https:") && !u.hostname.includes(".") && u.hostname !== "localhost")
      return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export function safeEmail(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s) ? s : undefined;
}

function cleanImage(img: ImageRef | null | undefined, fallbackAlt?: string): CleanImage | undefined {
  if (!img) return undefined;
  const src = safeUrl(img.src);
  if (!src) return undefined;
  const srcset = str(img.srcset);
  return {
    src,
    srcset: srcset && !/javascript:/i.test(srcset) ? srcset : undefined,
    width: img.width ?? undefined,
    height: img.height ?? undefined,
    alt: str(img.alt) ?? fallbackAlt,
  };
}

function year(v: unknown): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v >= 1950 && v <= 2100 ? v : undefined;
}

/** Accepts YYYY, YYYY-MM or YYYY-MM-DD (or a full ISO string); returns YYYY-MM-DD or undefined. */
export function isoDate(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(s);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 1;
  const d = m[3] ? Number(m[3]) : 1;
  if (y < 1950 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  return `${m[1]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function entries(list: unknown): Entry[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((e) => ({
      title: str(e?.title) ?? "",
      subtitle: str(e?.subtitle),
      description: str(e?.description),
      date: isoDate(e?.date),
      url: safeUrl(e?.url),
    }))
    .filter((e) => e.title);
}

export function normalize(data: PortfolioData): CleanData {
  const p = data.personal;
  const fullName = str(p.fullName) ?? "";

  const socials: Link[] = [];
  const seenUrls = new Set<string>();
  for (const s of p.socials ?? []) {
    const url = safeUrl(s?.url);
    const label = str(s?.label);
    if (!url || !label || seenUrls.has(url)) continue;
    seenUrls.add(url);
    socials.push({ label, url });
  }

  const education = (data.education ?? [])
    .map((e) => ({
      institution: str(e.institution) ?? "",
      degree: str(e.degree),
      major: str(e.major),
      startYear: year(e.startYear),
      endYear: year(e.endYear),
      grade: str(e.grade),
      coursework: strList(e.coursework),
      achievements: strList(e.achievements),
    }))
    .filter((e) => e.institution)
    .sort((a, b) => (b.endYear ?? b.startYear ?? 0) - (a.endYear ?? a.startYear ?? 0));

  const skillMap = new Map<string, { category: string; items: string[]; seen: Set<string> }>();
  for (const g of data.skills ?? []) {
    const category = str(g.category) ?? "Skills";
    const key = category.toLowerCase();
    const group = skillMap.get(key) ?? { category, items: [], seen: new Set<string>() };
    for (const item of g.items ?? []) {
      const s = str(item);
      if (!s || group.seen.has(s.toLowerCase())) continue;
      group.seen.add(s.toLowerCase());
      group.items.push(s);
    }
    skillMap.set(key, group);
  }
  const skills = [...skillMap.values()].filter((g) => g.items.length).map(({ category, items }) => ({ category, items }));

  const projects = (data.projects ?? [])
    .map((pr) => {
      const name = str(pr.name) ?? "";
      return {
        name,
        summary: str(pr.summary),
        description: str(pr.description),
        technologies: strList(pr.technologies),
        features: strList(pr.features),
        contributions: str(pr.contributions),
        category: str(pr.category),
        repoUrl: safeUrl(pr.repoUrl),
        liveUrl: safeUrl(pr.liveUrl),
        image: cleanImage(pr.image, name),
        screenshots: (pr.screenshots ?? []).map((s) => cleanImage(s, name)).filter((s): s is CleanImage => !!s),
      };
    })
    .filter((pr) => pr.name);

  const experience = (data.experience ?? [])
    .map((x) => {
      const endDate = isoDate(x.endDate);
      return {
        organization: str(x.organization) ?? "",
        title: str(x.title) ?? "",
        employmentType: str(x.employmentType),
        startDate: isoDate(x.startDate),
        endDate,
        current: !endDate && !!isoDate(x.startDate),
        responsibilities: strList(x.responsibilities),
        achievements: strList(x.achievements),
        skills: strList(x.skills),
      };
    })
    .filter((x) => x.organization && x.title)
    .sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;
      return (b.endDate ?? b.startDate ?? "").localeCompare(a.endDate ?? a.startDate ?? "");
    });

  const certifications = (data.certifications ?? [])
    .map((c) => ({
      name: str(c.name) ?? "",
      issuer: str(c.issuer),
      issuedOn: isoDate(c.issuedOn),
      credentialUrl: safeUrl(c.credentialUrl),
      fileUrl: safeUrl(c.fileUrl),
    }))
    .filter((c) => c.name);

  const testimonials = (data.testimonials ?? [])
    .map((t) => ({ quote: str(t.quote) ?? "", author: str(t.author) ?? "", role: str(t.role) }))
    .filter((t) => t.quote && t.author);

  return {
    personal: {
      fullName,
      headline: str(p.headline),
      about: str(p.about),
      email: safeEmail(p.email),
      phone: str(p.phone),
      location: str(p.location),
      linkedinUrl: safeUrl(p.linkedinUrl),
      githubUrl: safeUrl(p.githubUrl),
      socials,
      avatar: cleanImage(p.avatar, fullName),
      resumeUrl: safeUrl(p.resumeUrl),
    },
    education,
    skills,
    projects,
    experience,
    certifications,
    awards: entries(data.awards),
    publications: entries(data.publications),
    positions: entries(data.positions),
    extracurriculars: entries(data.extracurriculars),
    volunteering: entries(data.volunteering),
    hobbies: strList(data.hobbies),
    testimonials,
  };
}
