import { db } from "@/lib/db";
import { loadProfileForm } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { fileUrl, imageRef } from "@/lib/uploads";
import { ProfileEditor } from "./profile-editor";

export const metadata = { title: "My details" };

export default async function ProfilePage(props: PageProps<"/dashboard/profile">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const [form, files, portfolios, templates] = await Promise.all([
    loadProfileForm(user.id, user.name),
    db.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.portfolio.findMany({ where: { userId: user.id }, select: { template: { select: { slug: true } } }, take: 1 }),
    db.template.findMany({ where: { isEnabled: true }, select: { slug: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const fileMap = Object.fromEntries(
    files.map((f) => [f.id, { id: f.id, mimeType: f.mimeType, fileName: f.fileName, url: imageRef(f)?.src ?? fileUrl(f) }]),
  );
  return (
    <ProfileEditor
      initial={form}
      files={fileMap}
      welcome={sp.welcome === "1"}
      templates={templates}
      previewTemplate={portfolios[0]?.template.slug ?? templates[0]?.slug ?? "minimal"}
    />
  );
}
