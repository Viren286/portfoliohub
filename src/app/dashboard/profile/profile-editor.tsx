"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import type { ProfileForm } from "@/lib/profile";
import { FileUpload, uploadFile, type UploadedInfo } from "@/components/file-upload";
import { Alert, Spinner } from "@/components/form-bits";
import { saveProfileAction } from "../actions";

type Files = Record<string, UploadedInfo>;
type Reg = UseFormRegister<ProfileForm>;

const EXTRA_GROUPS = [
  { kind: "AWARD", title: "Awards & achievements", item: "award", fields: { title: "Award or achievement", subtitle: "Given by", description: "Details", date: true, url: true } },
  { kind: "PUBLICATION", title: "Research & publications", item: "publication", fields: { title: "Title", subtitle: "Journal, conference or venue", description: "Abstract or note", date: true, url: true } },
  { kind: "POSITION", title: "Positions of responsibility", item: "position", fields: { title: "Role", subtitle: "Organization", description: "What you did", date: true, url: false } },
  { kind: "EXTRACURRICULAR", title: "Extracurricular activities", item: "activity", fields: { title: "Activity", subtitle: "Club or organization", description: "Details", date: true, url: false } },
  { kind: "VOLUNTEER", title: "Volunteer work", item: "volunteer role", fields: { title: "Role", subtitle: "Organization", description: "What you did", date: true, url: true } },
  { kind: "TESTIMONIAL", title: "Testimonials", item: "testimonial", fields: { title: "Person's name", subtitle: "Their role", description: "What they said", date: false, url: false } },
  { kind: "HOBBY", title: "Hobbies & interests", item: "hobby", fields: { title: "Hobby or interest", subtitle: "", description: "", date: false, url: false } },
] as const;

const NAV = [
  ["personal", "About you"],
  ["projects", "Projects"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["skills", "Skills"],
  ["certifications", "Certifications"],
  ...EXTRA_GROUPS.map((g) => [g.kind.toLowerCase(), g.title] as const),
] as const;

function Card({ id, title, hint, children, action }: { id: string; title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-28 p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Item({ title, onRemove, onUp, onDown, children }: { title: string; onRemove: () => void; onUp?: () => void; onDown?: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-ink-2">{title}</p>
        <div className="flex shrink-0 items-center gap-1 text-xs">
          {onUp && <button type="button" onClick={onUp} className="rounded-md px-2 py-1 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Move up">↑</button>}
          {onDown && <button type="button" onClick={onDown} className="rounded-md px-2 py-1 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Move down">↓</button>}
          <button type="button" onClick={onRemove} className="rounded-md px-2 py-1 text-muted hover:bg-bad/10 hover:text-bad">Remove</button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

const AddButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} className="w-full rounded-xl border border-dashed border-line py-3 text-sm text-ink-2 transition hover:border-ink hover:text-ink">
    + {children}
  </button>
);

const Empty = ({ children }: { children: React.ReactNode }) => <p className="rounded-xl bg-paper-2/60 px-4 py-3 text-sm text-muted">{children}</p>;

export function ProfileEditor({
  initial,
  files: initialFiles,
  welcome,
  templates,
  previewTemplate,
  next,
}: {
  initial: ProfileForm;
  files: Files;
  welcome: boolean;
  templates: { slug: string; name: string }[];
  previewTemplate: string;
  next: { href: string; label: string };
}) {
  const { register, control, handleSubmit, setValue, getValues, formState, reset } = useForm<ProfileForm>({ defaultValues: initial });
  const [files, setFiles] = useState<Files>(initialFiles);
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; msg: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [showPreview, setShowPreview] = useState(false);

  const socials = useFieldArray({ control, name: "personal.socials" });
  const education = useFieldArray({ control, name: "education" });
  const skills = useFieldArray({ control, name: "skills" });
  const projects = useFieldArray({ control, name: "projects" });
  const experience = useFieldArray({ control, name: "experience" });
  const certs = useFieldArray({ control, name: "certifications" });
  const extras = useFieldArray({ control, name: "extras" });

  const avatarId = useWatch({ control, name: "personal.avatarFileId" });
  const resumeId = useWatch({ control, name: "personal.resumeFileId" });

  const remember = (f: UploadedInfo | null) => {
    if (f) setFiles((m) => ({ ...m, [f.id]: f }));
    return f?.id ?? null;
  };

  const onSubmit = handleSubmit(
    (values) =>
      startSave(async () => {
        setStatus(null);
        const res = await saveProfileAction(values);
        if (res.ok) {
          reset(values); // clears "unsaved changes"
          setStatus({ tone: "ok", msg: "Saved. Your details are stored; publish to update your live site." });
        } else setStatus({ tone: "bad", msg: res.error });
      }),
    () => {
      setStatus({ tone: "bad", msg: "Your full name is required (top of the page)." });
      document.getElementById("personal")?.scrollIntoView({ behavior: "smooth" });
    },
  );

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (formState.isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [formState.isDirty]);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-7xl px-6 pb-32 pt-10" noValidate>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My details</p>
          <h1 className="display mt-2 text-5xl">Everything your site can show.</h1>
          <p className="mt-3 max-w-2xl text-ink-2">Only your name is required. Skip anything that doesn&rsquo;t apply: empty sections never appear on your site.</p>
        </div>
        <button type="button" onClick={() => setShowPreview((v) => !v)} className="btn-ghost">
          {showPreview ? "Hide preview" : "Show live preview"}
        </button>
      </div>
      {welcome && <div className="mt-6"><Alert tone="info">Welcome! Start with the basics below, then press <strong>Save</strong>. You can always come back.</Alert></div>}

      <div className={`mt-10 grid gap-8 ${showPreview ? "xl:grid-cols-[200px_1fr_1fr]" : "lg:grid-cols-[200px_1fr]"}`}>
        <nav className="hidden lg:block" aria-label="Sections">
          <ul className="sticky top-24 space-y-0.5 text-sm">
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          {/* ------------------------------------------------ personal */}
          <Card id="personal" title="About you" hint="Shown at the top of your site.">
            <div className="grid gap-6 sm:grid-cols-2">
              <FileUpload
                kind="AVATAR"
                label="Profile photo"
                shape="round"
                hint="JPG, PNG or WebP. Without one, templates show your initials."
                value={avatarId ? files[avatarId] ?? null : null}
                onChange={(f) => setValue("personal.avatarFileId", remember(f), { shouldDirty: true })}
              />
              <FileUpload
                kind="RESUME"
                label="Résumé"
                shape="square"
                hint="PDF or DOCX. Adds a download button."
                value={resumeId ? files[resumeId] ?? null : null}
                onChange={(f) => setValue("personal.resumeFileId", remember(f), { shouldDirty: true })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *"><input className="input" {...register("personal.fullName", { required: true })} autoComplete="name" /></Field>
              <Field label="Professional title / headline"><input className="input" placeholder="Full-stack developer" {...register("personal.headline")} /></Field>
              <Field label="Email shown on site"><input className="input" type="email" {...register("personal.contactEmail")} /></Field>
              <Field label="Phone (optional)"><input className="input" {...register("personal.phone")} autoComplete="tel" /></Field>
              <Field label="Location"><input className="input" placeholder="New Delhi, India" {...register("personal.location")} /></Field>
              <Field label="LinkedIn URL"><input className="input" placeholder="linkedin.com/in/you" {...register("personal.linkedinUrl")} /></Field>
              <Field label="GitHub URL"><input className="input" placeholder="github.com/you" {...register("personal.githubUrl")} /></Field>
            </div>
            <Field label="About me"><textarea className="textarea min-h-32" placeholder="A few sentences about what you do and what you care about." {...register("personal.about")} /></Field>
            <div>
              <span className="label">Other links</span>
              <div className="space-y-2">
                {socials.fields.map((f, i) => (
                  <div key={f.id} className="flex gap-2">
                    <input className="input w-36" placeholder="Label" {...register(`personal.socials.${i}.label`)} />
                    <input className="input flex-1" placeholder="https://" {...register(`personal.socials.${i}.url`)} />
                    <button type="button" className="btn-ghost btn-sm" onClick={() => socials.remove(i)}>Remove</button>
                  </div>
                ))}
                {socials.fields.length < 12 && <AddButton onClick={() => socials.append({ label: "", url: "" })}>Add a link (blog, X, Behance…)</AddButton>}
              </div>
            </div>
          </Card>

          {/* ------------------------------------------------ projects */}
          <Card id="projects" title="Projects" hint="Your strongest work first. Projects without a live link still look finished.">
            {projects.fields.length === 0 && <Empty>No projects yet.</Empty>}
            {projects.fields.map((f, i) => (
              <ProjectItem key={f.id} i={i} total={projects.fields.length} control={control} register={register} setValue={setValue} getValues={getValues} files={files} remember={remember} onRemove={() => projects.remove(i)} onMove={(to) => projects.move(i, to)} />
            ))}
            <AddButton onClick={() => projects.append({ name: "", summary: "", description: "", technologies: "", features: "", contributions: "", category: "", repoUrl: "", liveUrl: "", thumbFileId: null, screenshotFileIds: [] })}>Add a project</AddButton>
          </Card>

          {/* ------------------------------------------------ experience */}
          <Card id="experience" title="Experience" hint="Jobs, internships, freelance work. Leave the end date empty if it's current.">
            {experience.fields.length === 0 && <Empty>No experience yet? That&rsquo;s fine: this section won&rsquo;t appear.</Empty>}
            {experience.fields.map((f, i) => (
              <Item key={f.id} title={`Role ${i + 1}`} onRemove={() => experience.remove(i)} onUp={i ? () => experience.move(i, i - 1) : undefined} onDown={i < experience.fields.length - 1 ? () => experience.move(i, i + 1) : undefined}>
                <Field label="Company / organization"><input className="input" {...register(`experience.${i}.organization`)} /></Field>
                <Field label="Job title"><input className="input" {...register(`experience.${i}.title`)} /></Field>
                <Field label="Employment type">
                  <select className="input" {...register(`experience.${i}.employmentType`)}>
                    <option value="">Not specified</option>
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="FREELANCE">Freelance</option>
                    <option value="VOLUNTEER">Volunteer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start"><input className="input" type="month" {...register(`experience.${i}.startDate`)} /></Field>
                  <Field label="End"><input className="input" type="month" {...register(`experience.${i}.endDate`)} /></Field>
                </div>
                <Field label="Responsibilities (one per line)" className="sm:col-span-2"><textarea className="textarea" {...register(`experience.${i}.responsibilities`)} /></Field>
                <Field label="Achievements (one per line)" className="sm:col-span-2"><textarea className="textarea" {...register(`experience.${i}.achievements`)} /></Field>
                <Field label="Skills used (comma separated)" className="sm:col-span-2"><input className="input" {...register(`experience.${i}.skills`)} /></Field>
              </Item>
            ))}
            <AddButton onClick={() => experience.append({ organization: "", title: "", employmentType: "", startDate: "", endDate: "", responsibilities: "", achievements: "", skills: "" })}>Add a role</AddButton>
          </Card>

          {/* ------------------------------------------------ education */}
          <Card id="education" title="Education">
            {education.fields.length === 0 && <Empty>No education added.</Empty>}
            {education.fields.map((f, i) => (
              <Item key={f.id} title={`Qualification ${i + 1}`} onRemove={() => education.remove(i)} onUp={i ? () => education.move(i, i - 1) : undefined} onDown={i < education.fields.length - 1 ? () => education.move(i, i + 1) : undefined}>
                <Field label="College / university" className="sm:col-span-2"><input className="input" {...register(`education.${i}.institution`)} /></Field>
                <Field label="Degree"><input className="input" placeholder="B.Tech" {...register(`education.${i}.degree`)} /></Field>
                <Field label="Specialization / major"><input className="input" {...register(`education.${i}.major`)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start year"><input className="input" inputMode="numeric" maxLength={4} {...register(`education.${i}.startYear`)} /></Field>
                  <Field label="Graduation year"><input className="input" inputMode="numeric" maxLength={4} {...register(`education.${i}.endYear`)} /></Field>
                </div>
                <Field label="CGPA / percentage (optional)"><input className="input" placeholder="8.6 CGPA" {...register(`education.${i}.grade`)} /></Field>
                <Field label="Relevant coursework (comma separated)" className="sm:col-span-2"><input className="input" {...register(`education.${i}.coursework`)} /></Field>
                <Field label="Achievements (one per line)" className="sm:col-span-2"><textarea className="textarea" {...register(`education.${i}.achievements`)} /></Field>
              </Item>
            ))}
            <AddButton onClick={() => education.append({ institution: "", degree: "", major: "", startYear: "", endYear: "", grade: "", coursework: "", achievements: "" })}>Add a qualification</AddButton>
          </Card>

          {/* ------------------------------------------------ skills */}
          <Card id="skills" title="Skills" hint="Group skills into categories. Add as many as you like, separated by commas.">
            {skills.fields.map((f, i) => (
              <div key={f.id} className="flex flex-col gap-2 sm:flex-row">
                <input className="input sm:w-56" placeholder="Category" {...register(`skills.${i}.category`)} />
                <input className="input flex-1" placeholder="Python, React, PostgreSQL" {...register(`skills.${i}.items`)} />
                <button type="button" className="btn-ghost btn-sm" onClick={() => skills.remove(i)}>Remove</button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {["Programming languages", "Frameworks", "Libraries", "Databases", "Developer tools", "Soft skills", "Other"].map((c) => (
                <button key={c} type="button" className="rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-ink" onClick={() => skills.append({ category: c, items: "" })}>+ {c}</button>
              ))}
            </div>
          </Card>

          {/* ------------------------------------------------ certifications */}
          <Card id="certifications" title="Certifications">
            {certs.fields.length === 0 && <Empty>No certifications added.</Empty>}
            {certs.fields.map((f, i) => (
              <CertItem key={f.id} i={i} register={register} control={control} setValue={setValue} files={files} remember={remember} onRemove={() => certs.remove(i)} />
            ))}
            <AddButton onClick={() => certs.append({ name: "", issuer: "", issuedOn: "", credentialUrl: "", fileId: null })}>Add a certification</AddButton>
          </Card>

          {/* ------------------------------------------------ extra sections */}
          {EXTRA_GROUPS.map((g) => {
            const idx = extras.fields.map((f, i) => ({ f, i })).filter(({ f }) => f.kind === g.kind);
            return (
              <Card key={g.kind} id={g.kind.toLowerCase()} title={g.title}>
                {idx.map(({ f, i }, n) => (
                  <Item key={f.id} title={`${g.item.charAt(0).toUpperCase() + g.item.slice(1)} ${n + 1}`} onRemove={() => extras.remove(i)}>
                    <Field label={g.fields.title} className={g.fields.subtitle ? "" : "sm:col-span-2"}><input className="input" {...register(`extras.${i}.title`)} /></Field>
                    {g.fields.subtitle && <Field label={g.fields.subtitle}><input className="input" {...register(`extras.${i}.subtitle`)} /></Field>}
                    {g.fields.description && <Field label={g.fields.description} className="sm:col-span-2"><textarea className="textarea" {...register(`extras.${i}.description`)} /></Field>}
                    {g.fields.date && <Field label="Date"><input className="input" type="month" {...register(`extras.${i}.date`)} /></Field>}
                    {g.fields.url && <Field label="Link"><input className="input" placeholder="https://" {...register(`extras.${i}.url`)} /></Field>}
                  </Item>
                ))}
                <AddButton onClick={() => extras.append({ kind: g.kind, title: "", subtitle: "", description: "", date: "", url: "" })}>Add {g.item}</AddButton>
              </Card>
            );
          })}
        </div>

        {showPreview && <PreviewPanel control={control} templates={templates} initialTemplate={previewTemplate} />}
      </div>

      {/* sticky save bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur transition-colors ${
          status?.tone === "ok" ? "border-ok/40 bg-ok/10" : status?.tone === "bad" ? "border-bad/40 bg-bad/10" : "border-line bg-paper/95"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
          <div className="min-w-0 flex-1 text-sm font-medium" role="status" aria-live="polite">
            {saving ? (
              <span className="text-ink-2">Saving…</span>
            ) : status ? (
              <span className={status.tone === "ok" ? "text-ok" : "text-bad"}>{status.tone === "ok" ? "✓ " : "⚠ "}{status.msg}</span>
            ) : formState.isDirty ? (
              <span className="text-warn">Unsaved changes</span>
            ) : (
              <span className="text-muted">All changes saved</span>
            )}
          </div>
          <Link href="/dashboard" className="btn-ghost">Back</Link>
          <button className="btn-ink min-w-28" disabled={saving}>{saving ? <Spinner /> : status?.tone === "ok" && !formState.isDirty ? "Saved ✓" : "Save"}</button>
          {status?.tone === "ok" && !formState.isDirty && <Link href={next.href} className="btn-signal">{next.label} →</Link>}
        </div>
      </div>
    </form>
  );
}

function ProjectItem({
  i,
  total,
  control,
  register,
  setValue,
  getValues,
  files,
  remember,
  onRemove,
  onMove,
}: {
  i: number;
  total: number;
  control: Control<ProfileForm>;
  register: Reg;
  setValue: UseFormSetValue<ProfileForm>;
  getValues: () => ProfileForm;
  files: Files;
  remember: (f: UploadedInfo | null) => string | null;
  onRemove: () => void;
  onMove: (to: number) => void;
}) {
  const name = useWatch({ control, name: `projects.${i}.name` });
  const thumb = useWatch({ control, name: `projects.${i}.thumbFileId` });
  const shots = useWatch({ control, name: `projects.${i}.screenshotFileIds` }) ?? [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const shotInput = useRef<HTMLInputElement>(null);

  async function addShots(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setErr("");
    const ids: string[] = [];
    for (const f of Array.from(list).slice(0, 12 - shots.length)) {
      try {
        ids.push(remember(await uploadFile(f, "PROJECT_IMAGE"))!);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed");
      }
    }
    setValue(`projects.${i}.screenshotFileIds`, [...getValues().projects[i].screenshotFileIds, ...ids], { shouldDirty: true });
    setBusy(false);
  }

  return (
    <Item title={name || `Project ${i + 1}`} onRemove={onRemove} onUp={i ? () => onMove(i - 1) : undefined} onDown={i < total - 1 ? () => onMove(i + 1) : undefined}>
      <Field label="Project name"><input className="input" {...register(`projects.${i}.name`)} /></Field>
      <Field label="Category"><input className="input" placeholder="Web app, Research, Open source…" {...register(`projects.${i}.category`)} /></Field>
      <Field label="Short description" className="sm:col-span-2"><input className="input" maxLength={300} {...register(`projects.${i}.summary`)} /></Field>
      <Field label="Detailed description" className="sm:col-span-2"><textarea className="textarea" {...register(`projects.${i}.description`)} /></Field>
      <Field label="Technologies (comma separated)"><input className="input" {...register(`projects.${i}.technologies`)} /></Field>
      <Field label="Your contribution"><input className="input" placeholder="Built the backend and CI" {...register(`projects.${i}.contributions`)} /></Field>
      <Field label="Key features (one per line)" className="sm:col-span-2"><textarea className="textarea" {...register(`projects.${i}.features`)} /></Field>
      <Field label="GitHub repository URL"><input className="input" placeholder="github.com/you/project" {...register(`projects.${i}.repoUrl`)} /></Field>
      <Field label="Live project URL (optional)"><input className="input" placeholder="https://" {...register(`projects.${i}.liveUrl`)} /></Field>
      <FileUpload kind="PROJECT_IMAGE" label="Thumbnail" shape="wide" value={thumb ? files[thumb] ?? null : null} onChange={(f) => setValue(`projects.${i}.thumbFileId`, remember(f), { shouldDirty: true })} />
      <div>
        <span className="label">Screenshots</span>
        <div className="flex flex-wrap gap-2">
          {shots.map((id) =>
            files[id] ? (
              <div key={id} className="group relative h-14 w-20 overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={files[id].url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove screenshot"
                  className="absolute inset-0 hidden place-items-center bg-ink/60 text-xs text-white group-hover:grid"
                  onClick={() => setValue(`projects.${i}.screenshotFileIds`, shots.filter((x) => x !== id), { shouldDirty: true })}
                >
                  Remove
                </button>
              </div>
            ) : null,
          )}
          {shots.length < 12 && (
            <button type="button" onClick={() => shotInput.current?.click()} className="grid h-14 w-20 place-items-center rounded-lg border border-dashed border-line text-muted hover:border-ink">
              {busy ? <Spinner /> : "+"}
            </button>
          )}
        </div>
        {err && <p className="mt-1 text-xs text-bad">{err}</p>}
        <input ref={shotInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(e) => addShots(e.target.files)} />
      </div>
    </Item>
  );
}

function CertItem({
  i,
  register,
  control,
  setValue,
  files,
  remember,
  onRemove,
}: {
  i: number;
  register: Reg;
  control: Control<ProfileForm>;
  setValue: UseFormSetValue<ProfileForm>;
  files: Files;
  remember: (f: UploadedInfo | null) => string | null;
  onRemove: () => void;
}) {
  const fileId = useWatch({ control, name: `certifications.${i}.fileId` });
  return (
    <Item title={`Certification ${i + 1}`} onRemove={onRemove}>
      <Field label="Certification name" className="sm:col-span-2"><input className="input" {...register(`certifications.${i}.name`)} /></Field>
      <Field label="Issuing organization"><input className="input" {...register(`certifications.${i}.issuer`)} /></Field>
      <Field label="Issue date"><input className="input" type="month" {...register(`certifications.${i}.issuedOn`)} /></Field>
      <Field label="Credential URL"><input className="input" placeholder="https://" {...register(`certifications.${i}.credentialUrl`)} /></Field>
      <FileUpload kind="CERTIFICATE" label="Certificate file" value={fileId ? files[fileId] ?? null : null} onChange={(f) => setValue(`certifications.${i}.fileId`, remember(f), { shouldDirty: true })} />
    </Item>
  );
}

function PreviewPanel({ control, templates, initialTemplate }: { control: Control<ProfileForm>; templates: { slug: string; name: string }[]; initialTemplate: string }) {
  const values = useWatch({ control });
  const [template, setTemplate] = useState(initialTemplate);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const payload = useMemo(() => JSON.stringify({ templateSlug: template, form: values }), [template, values]);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, signal: ctrl.signal });
        const text = await res.text();
        if (res.ok) {
          setHtml(text);
          setError("");
        } else setError(text);
      } catch {
        /* aborted */
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [payload]);

  return (
    <aside className="min-w-0">
      <div className="sticky top-20">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Live preview</p>
          <select className="input w-auto py-1.5 text-xs" value={template} onChange={(e) => setTemplate(e.target.value)} aria-label="Preview template">
            {templates.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-white" style={{ height: "calc(100vh - 170px)" }}>
          {error ? <p className="p-6 text-sm text-muted">{error}</p> : <iframe title="Live preview" srcDoc={html} sandbox="allow-scripts" className="size-full border-0" />}
        </div>
      </div>
    </aside>
  );
}
