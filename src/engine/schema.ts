/**
 * The structured input object for the portfolio generation engine.
 *
 * Every field is optional except the person's name. The engine never assumes a
 * section exists: empty or missing data is removed in `normalize()` before any
 * template sees it.
 */
import { z } from "zod";

const text = (max: number) => z.string().max(max).optional().nullable();
const list = <T extends z.ZodTypeAny>(item: T, max: number) => z.array(item).max(max).optional().nullable();
const shortList = list(z.string().max(200), 40);

export const ImageRefSchema = z.object({
  src: z.string().max(2000),
  srcset: z.string().max(4000).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  alt: text(300),
});
export type ImageRef = z.infer<typeof ImageRefSchema>;

export const PersonalSchema = z.object({
  fullName: z.string().max(120),
  headline: text(160),
  about: text(4000),
  email: text(200),
  phone: text(40),
  location: text(120),
  linkedinUrl: text(500),
  githubUrl: text(500),
  socials: list(z.object({ label: z.string().max(40), url: z.string().max(500) }), 12),
  avatar: ImageRefSchema.optional().nullable(),
  resumeUrl: text(2000),
});

export const EducationSchema = z.object({
  institution: z.string().max(200),
  degree: text(120),
  major: text(160),
  startYear: z.number().int().optional().nullable(),
  endYear: z.number().int().optional().nullable(),
  grade: text(40),
  coursework: shortList,
  achievements: shortList,
});

export const SkillGroupSchema = z.object({
  category: z.string().max(60),
  items: z.array(z.string().max(60)).max(80),
});

export const ProjectSchema = z.object({
  name: z.string().max(120),
  summary: text(300),
  description: text(5000),
  technologies: shortList,
  features: shortList,
  contributions: text(2000),
  category: text(60),
  repoUrl: text(500),
  liveUrl: text(500),
  image: ImageRefSchema.optional().nullable(),
  screenshots: list(ImageRefSchema, 12),
});

export const ExperienceSchema = z.object({
  organization: z.string().max(160),
  title: z.string().max(160),
  employmentType: text(40),
  startDate: text(40), // ISO date (YYYY-MM or YYYY-MM-DD)
  endDate: text(40), // empty = present
  responsibilities: shortList,
  achievements: shortList,
  skills: shortList,
});

export const CertificationSchema = z.object({
  name: z.string().max(200),
  issuer: text(160),
  issuedOn: text(40),
  credentialUrl: text(500),
  fileUrl: text(2000),
});

export const EntrySchema = z.object({
  title: z.string().max(200),
  subtitle: text(200),
  description: text(2000),
  date: text(40),
  url: text(500),
});

export const TestimonialSchema = z.object({
  quote: z.string().max(1000),
  author: z.string().max(120),
  role: text(160),
});

export const PortfolioDataSchema = z.object({
  personal: PersonalSchema,
  education: list(EducationSchema, 20),
  skills: list(SkillGroupSchema, 20),
  projects: list(ProjectSchema, 60),
  experience: list(ExperienceSchema, 40),
  certifications: list(CertificationSchema, 60),
  awards: list(EntrySchema, 40),
  publications: list(EntrySchema, 60),
  positions: list(EntrySchema, 40),
  extracurriculars: list(EntrySchema, 40),
  volunteering: list(EntrySchema, 40),
  hobbies: list(z.string().max(80), 30),
  testimonials: list(TestimonialSchema, 20),
});
export type PortfolioData = z.input<typeof PortfolioDataSchema>;

// ---------------------------------------------------------------- customization

export const SECTION_KEYS = [
  "about",
  "experience",
  "projects",
  "skills",
  "education",
  "certifications",
  "awards",
  "publications",
  "positions",
  "extracurriculars",
  "volunteering",
  "testimonials",
  "hobbies",
  "contact",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const FONT_KEYS = ["inter", "space-grotesk", "fraunces", "playfair", "jetbrains", "dm-sans", "system"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const CustomizationSchema = z.object({
  primaryColor: hex.optional(),
  secondaryColor: hex.optional(),
  font: z.enum(FONT_KEYS).optional(),
  headingFont: z.enum(FONT_KEYS).optional(),
  mode: z.enum(["light", "dark"]).optional(),
  background: z.enum(["plain", "grid", "dots", "glow"]).optional(),
  cardStyle: z.enum(["flat", "bordered", "elevated"]).optional(),
  animation: z.enum(["none", "subtle", "lively"]).optional(),
  showAvatar: z.boolean().optional(),
  showSocials: z.boolean().optional(),
  introText: z.string().max(400).optional(),
  sectionOrder: z.array(z.enum(SECTION_KEYS)).max(SECTION_KEYS.length).optional(),
  hiddenSections: z.array(z.enum(SECTION_KEYS)).max(SECTION_KEYS.length).optional(),
});
export type Customization = z.infer<typeof CustomizationSchema>;
export type ResolvedCustomization = Required<Omit<Customization, "introText">> & { introText?: string };
