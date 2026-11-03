import "server-only";
import { z } from "zod";
import type { ExtraKind } from "@/generated/prisma/client";
import type { PortfolioData } from "@/engine/schema";
import { db } from "./db";
import { fileUrl, imageRef } from "./uploads";

/* ----------------------------------------------------------------------------
 * Form shape used by the editor. Lists the user types as text (skills, bullet
 * points) are plain strings here and split on save. Everything is optional
 * except the name.
 * -------------------------------------------------------------------------- */

const s = (max: number) => z.string().max(max).default("");
const id = z.string().max(40).optional().nullable();

export const EXTRA_KINDS = ["AWARD", "PUBLICATION", "POSITION", "EXTRACURRICULAR", "VOLUNTEER", "HOBBY", "TESTIMONIAL"] as const;

export const ProfileFormSchema = z.object({
  personal: z.object({
    fullName: z.string().trim().min(1, "Your name is required").max(120),
    headline: s(160),
    about: s(4000),
    contactEmail: s(200),
    phone: s(40),
    location: s(120),
    linkedinUrl: s(500),
    githubUrl: s(500),
    socials: z.array(z.object({ label: s(40), url: s(500) })).max(12).default([]),
    avatarFileId: id,
    resumeFileId: id,
  }),
  education: z
    .array(
      z.object({
        institution: s(200),
        degree: s(120),
        major: s(160),
        startYear: s(4),
        endYear: s(4),
        grade: s(40),
        coursework: s(1000),
        achievements: s(2000),
      }),
    )
    .max(20)
    .default([]),
  skills: z.array(z.object({ category: s(60), items: s(2000) })).max(20).default([]),
  projects: z
    .array(
      z.object({
        name: s(120),
        summary: s(300),
        description: s(5000),
        technologies: s(1000),
        features: s(3000),
        contributions: s(2000),
        category: s(60),
        repoUrl: s(500),
        liveUrl: s(500),
        thumbFileId: id,
        screenshotFileIds: z.array(z.string().max(40)).max(12).default([]),
      }),
    )
    .max(60)
    .default([]),
  experience: z
    .array(
      z.object({
        organization: s(160),
        title: s(160),
        employmentType: z.enum(["", "FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "FREELANCE", "VOLUNTEER", "OTHER"]).default(""),
        startDate: s(10),
        endDate: s(10),
        responsibilities: s(4000),
        achievements: s(3000),
        skills: s(1000),
      }),
    )
    .max(40)
    .default([]),
  certifications: z
    .array(z.object({ name: s(200), issuer: s(160), issuedOn: s(10), credentialUrl: s(500), fileId: id }))
    .max(60)
    .default([]),
  extras: z
    .array(z.object({ kind: z.enum(EXTRA_KINDS), title: s(200), subtitle: s(200), description: s(2000), date: s(10), url: s(500) }))
    .max(200)
    .default([]),
});
export type ProfileForm = z.infer<typeof ProfileFormSchema>;
export type ProfileFormInput = z.input<typeof ProfileFormSchema>;

const splitComma = (v: string) => v.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const splitLines = (v: string) => v.split("\n").map((x) => x.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
const toYear = (v: string) => (/^\d{4}$/.test(v.trim()) ? Number(v.trim()) : null);
const toDate = (v: string) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v.trim());
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3] ?? 1))) : null;
};
const blank = (v: string) => (v.trim() ? v.trim() : null);
const ym = (d: Date | null) => (d ? d.toISOString().slice(0, 7) : "");

export function emptyProfileForm(name = ""): ProfileForm {
  return ProfileFormSchema.parse({ personal: { fullName: name || "-" } , education: [], skills: [], projects: [], experience: [], certifications: [], extras: [] });
}

export async function loadProfileForm(userId: string, fallbackName: string): Promise<ProfileForm> {
  const u = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      education: { orderBy: { position: "asc" } },
      skills: { orderBy: { position: "asc" } },
      projects: { orderBy: { position: "asc" }, include: { media: { orderBy: { position: "asc" } } } },
      experiences: { orderBy: { position: "asc" } },
      certifications: { orderBy: { position: "asc" } },
      extras: { orderBy: [{ kind: "asc" }, { position: "asc" }] },
    },
  });
  if (!u) throw new Error("User not found");
  const p = u.profile;

  const skillGroups = new Map<string, string[]>();
  for (const sk of u.skills) skillGroups.set(sk.category, [...(skillGroups.get(sk.category) ?? []), sk.name]);

  return {
    personal: {
      fullName: p?.fullName ?? fallbackName,
      headline: p?.headline ?? "",
      about: p?.about ?? "",
      contactEmail: p?.contactEmail ?? "",
      phone: p?.phone ?? "",
      location: p?.location ?? "",
      linkedinUrl: p?.linkedinUrl ?? "",
      githubUrl: p?.githubUrl ?? "",
      socials: ((p?.socials as { label: string; url: string }[] | null) ?? []).map((x) => ({ label: x.label ?? "", url: x.url ?? "" })),
      avatarFileId: p?.avatarFileId ?? null,
      resumeFileId: p?.resumeFileId ?? null,
    },
    education: u.education.map((e) => ({
      institution: e.institution,
      degree: e.degree ?? "",
      major: e.major ?? "",
      startYear: e.startYear ? String(e.startYear) : "",
      endYear: e.endYear ? String(e.endYear) : "",
      grade: e.grade ?? "",
      coursework: e.coursework.join(", "),
      achievements: e.achievements.join("\n"),
    })),
    skills: [...skillGroups.entries()].map(([category, items]) => ({ category, items: items.join(", ") })),
    projects: u.projects.map((pr) => ({
      name: pr.name,
      summary: pr.summary ?? "",
      description: pr.description ?? "",
      technologies: pr.technologies.join(", "),
      features: pr.features.join("\n"),
      contributions: pr.contributions ?? "",
      category: pr.category ?? "",
      repoUrl: pr.repoUrl ?? "",
      liveUrl: pr.liveUrl ?? "",
      thumbFileId: pr.thumbFileId,
      screenshotFileIds: pr.media.map((m) => m.fileId),
    })),
    experience: u.experiences.map((x) => ({
      organization: x.organization,
      title: x.title,
      employmentType: x.employmentType ?? "",
      startDate: ym(x.startDate),
      endDate: ym(x.endDate),
      responsibilities: x.responsibilities.join("\n"),
      achievements: x.achievements.join("\n"),
      skills: x.skills.join(", "),
    })),
    certifications: u.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer ?? "",
      issuedOn: ym(c.issuedOn),
      credentialUrl: c.credentialUrl ?? "",
      fileId: c.fileId,
    })),
    extras: u.extras.map((e) => ({
      kind: e.kind,
      title: e.title,
      subtitle: e.subtitle ?? "",
      description: e.description ?? "",
      date: ym(e.date),
      url: e.url ?? "",
    })),
  };
}

/** Replaces the user's content with the submitted form, in one transaction. */
export async function saveProfile(userId: string, form: ProfileForm) {
  const fileIds = [
    form.personal.avatarFileId,
    form.personal.resumeFileId,
    ...form.projects.flatMap((p) => [p.thumbFileId, ...p.screenshotFileIds]),
    ...form.certifications.map((c) => c.fileId),
  ].filter((x): x is string => !!x);
  const owned = new Set(
    (await db.uploadedFile.findMany({ where: { id: { in: fileIds }, userId }, select: { id: true } })).map((f) => f.id),
  );
  const own = (fid?: string | null) => (fid && owned.has(fid) ? fid : null);

  const P = form.personal;
  await db.$transaction(async (tx) => {
    const profileData = {
      fullName: P.fullName.trim(),
      headline: blank(P.headline),
      about: blank(P.about),
      contactEmail: blank(P.contactEmail),
      phone: blank(P.phone),
      location: blank(P.location),
      linkedinUrl: blank(P.linkedinUrl),
      githubUrl: blank(P.githubUrl),
      socials: P.socials.filter((x) => x.label.trim() && x.url.trim()).map((x) => ({ label: x.label.trim(), url: x.url.trim() })),
      avatarFileId: own(P.avatarFileId),
      resumeFileId: own(P.resumeFileId),
    };
    await tx.profile.upsert({ where: { userId }, update: profileData, create: { userId, ...profileData } });
    await tx.user.update({ where: { id: userId }, data: { name: P.fullName.trim() } });

    await tx.education.deleteMany({ where: { userId } });
    await tx.education.createMany({
      data: form.education
        .filter((e) => e.institution.trim())
        .map((e, i) => ({
          userId,
          position: i,
          institution: e.institution.trim(),
          degree: blank(e.degree),
          major: blank(e.major),
          startYear: toYear(e.startYear),
          endYear: toYear(e.endYear),
          grade: blank(e.grade),
          coursework: splitComma(e.coursework),
          achievements: splitLines(e.achievements),
        })),
    });

    await tx.skill.deleteMany({ where: { userId } });
    const seen = new Set<string>();
    const skillRows: { userId: string; category: string; name: string; position: number }[] = [];
    form.skills.forEach((g) => {
      const category = g.category.trim() || "Skills";
      for (const name of splitComma(g.items)) {
        const k = `${category.toLowerCase()}|${name.toLowerCase()}`;
        if (seen.has(k)) continue;
        seen.add(k);
        skillRows.push({ userId, category, name: name.slice(0, 60), position: skillRows.length });
      }
    });
    await tx.skill.createMany({ data: skillRows });

    await tx.project.deleteMany({ where: { userId } });
    let pos = 0;
    for (const p of form.projects) {
      if (!p.name.trim()) continue;
      await tx.project.create({
        data: {
          userId,
          position: pos++,
          name: p.name.trim(),
          summary: blank(p.summary),
          description: blank(p.description),
          technologies: splitComma(p.technologies),
          features: splitLines(p.features),
          contributions: blank(p.contributions),
          category: blank(p.category),
          repoUrl: blank(p.repoUrl),
          liveUrl: blank(p.liveUrl),
          thumbFileId: own(p.thumbFileId),
          media: { create: p.screenshotFileIds.map(own).filter((x): x is string => !!x).map((fileId, i) => ({ fileId, position: i })) },
        },
      });
    }

    await tx.experience.deleteMany({ where: { userId } });
    await tx.experience.createMany({
      data: form.experience
        .filter((x) => x.organization.trim() && x.title.trim())
        .map((x, i) => ({
          userId,
          position: i,
          organization: x.organization.trim(),
          title: x.title.trim(),
          employmentType: x.employmentType || null,
          startDate: toDate(x.startDate),
          endDate: toDate(x.endDate),
          responsibilities: splitLines(x.responsibilities),
          achievements: splitLines(x.achievements),
          skills: splitComma(x.skills),
        })),
    });

    await tx.certification.deleteMany({ where: { userId } });
    await tx.certification.createMany({
      data: form.certifications
        .filter((c) => c.name.trim())
        .map((c, i) => ({
          userId,
          position: i,
          name: c.name.trim(),
          issuer: blank(c.issuer),
          issuedOn: toDate(c.issuedOn),
          credentialUrl: blank(c.credentialUrl),
          fileId: own(c.fileId),
        })),
    });

    await tx.extraItem.deleteMany({ where: { userId } });
    await tx.extraItem.createMany({
      data: form.extras
        .filter((e) => e.title.trim())
        .map((e, i) => ({
          userId,
          position: i,
          kind: e.kind as ExtraKind,
          title: e.title.trim(),
          subtitle: blank(e.subtitle),
          description: blank(e.description),
          date: toDate(e.date),
          url: blank(e.url),
        })),
    });
  });
}

/* ----------------------------------------------------------------------------
 * Engine input
 * -------------------------------------------------------------------------- */

type FileRow = { id: string; storageKey: string; variants: unknown; width: number | null; height: number | null; mimeType: string };

/** Converts the editor form (saved or unsaved) into the engine's PortfolioData. */
export async function formToPortfolioData(userId: string, form: ProfileForm): Promise<PortfolioData> {
  const ids = [
    form.personal.avatarFileId,
    form.personal.resumeFileId,
    ...form.projects.flatMap((p) => [p.thumbFileId, ...p.screenshotFileIds]),
    ...form.certifications.map((c) => c.fileId),
  ].filter((x): x is string => !!x);
  const files = new Map<string, FileRow>(
    (await db.uploadedFile.findMany({ where: { id: { in: ids }, userId } })).map((f) => [f.id, f as FileRow]),
  );
  const image = (fid?: string | null, alt?: string) => {
    const f = fid ? files.get(fid) : undefined;
    return f ? imageRef(f as Parameters<typeof imageRef>[0], alt) : null;
  };
  const url = (fid?: string | null) => {
    const f = fid ? files.get(fid) : undefined;
    return f ? fileUrl(f) : null;
  };
  const P = form.personal;
  const byKind = (k: (typeof EXTRA_KINDS)[number]) => form.extras.filter((e) => e.kind === k);
  const entry = (e: ProfileForm["extras"][number]) => ({ title: e.title, subtitle: e.subtitle, description: e.description, date: e.date, url: e.url });

  return {
    personal: {
      fullName: P.fullName,
      headline: P.headline,
      about: P.about,
      email: P.contactEmail,
      phone: P.phone,
      location: P.location,
      linkedinUrl: P.linkedinUrl,
      githubUrl: P.githubUrl,
      socials: P.socials,
      avatar: image(P.avatarFileId, P.fullName),
      resumeUrl: url(P.resumeFileId),
    },
    education: form.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      major: e.major,
      startYear: toYear(e.startYear),
      endYear: toYear(e.endYear),
      grade: e.grade,
      coursework: splitComma(e.coursework),
      achievements: splitLines(e.achievements),
    })),
    skills: form.skills.map((g) => ({ category: g.category || "Skills", items: splitComma(g.items) })),
    projects: form.projects.map((p) => ({
      name: p.name,
      summary: p.summary,
      description: p.description,
      technologies: splitComma(p.technologies),
      features: splitLines(p.features),
      contributions: p.contributions,
      category: p.category,
      repoUrl: p.repoUrl,
      liveUrl: p.liveUrl,
      image: image(p.thumbFileId, p.name),
      screenshots: p.screenshotFileIds.map((f) => image(f, p.name)).filter((x): x is NonNullable<typeof x> => !!x),
    })),
    experience: form.experience.map((x) => ({
      organization: x.organization,
      title: x.title,
      employmentType: x.employmentType ? x.employmentType.replace("_", "-").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "",
      startDate: x.startDate,
      endDate: x.endDate,
      responsibilities: splitLines(x.responsibilities),
      achievements: splitLines(x.achievements),
      skills: splitComma(x.skills),
    })),
    certifications: form.certifications.map((c) => ({ name: c.name, issuer: c.issuer, issuedOn: c.issuedOn, credentialUrl: c.credentialUrl, fileUrl: url(c.fileId) })),
    awards: byKind("AWARD").map(entry),
    publications: byKind("PUBLICATION").map(entry),
    positions: byKind("POSITION").map(entry),
    extracurriculars: byKind("EXTRACURRICULAR").map(entry),
    volunteering: byKind("VOLUNTEER").map(entry),
    hobbies: byKind("HOBBY").map((e) => e.title),
    testimonials: byKind("TESTIMONIAL").map((e) => ({ quote: e.description, author: e.title, role: e.subtitle })),
  };
}

export async function loadPortfolioData(userId: string, fallbackName: string) {
  return formToPortfolioData(userId, await loadProfileForm(userId, fallbackName));
}
