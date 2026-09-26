"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordProblem } from "@/lib/security";
import { getSession, requireAdmin } from "@/lib/session";
import { getSettings, setSettings } from "@/lib/settings";

const EDITABLE_SETTING_KEYS = [
  "storeName",
  "contactEmail",
  "contactPhone",
  "businessAddress",
  "announcementText",
  "upiVpa",
  "razorpayMeUrl",
  "razorpayKeyId",
  "razorpayKeySecret",
] as const;

export async function updateSettings(formData: FormData): Promise<void> {
  await requireAdmin();

  const patch: Record<string, string> = {};
  for (const key of EDITABLE_SETTING_KEYS) {
    patch[key] = String(formData.get(key) ?? "").trim();
  }

  // Contact email rule: it may be changed at most ONCE after being first set,
  // and is permanently locked after that.
  const current = await getSettings();
  if (patch.contactEmail && patch.contactEmail !== current.contactEmail) {
    const changesSoFar = parseInt(current.contactEmailChanges ?? "0", 10) || 0;
    if (changesSoFar >= 1) {
      redirect("/admin/settings?email=locked");
    }
    patch.contactEmailChanges = String(changesSoFar + 1);
  }

  await setSettings(patch);

  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function changePassword(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");

  const redirectTo = String(formData.get("redirectTo") ?? "/account");
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
    redirect(`${redirectTo}?pwerror=1`);
  }
  if (passwordProblem(newPassword)) {
    redirect(`${redirectTo}?pwerror=weak`);
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  redirect(`${redirectTo}?saved=1`);
}

export async function updateProfile(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");

  const redirectTo = String(formData.get("redirectTo") ?? "/account");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length < 2) {
    redirect(`${redirectTo}?error=name`);
  }

  await db.user.update({
    where: { id: user.id },
    data: { name, phone: phone || null },
  });

  revalidatePath("/account");
  revalidatePath("/", "layout");
  redirect(`${redirectTo}?saved=1`);
}
