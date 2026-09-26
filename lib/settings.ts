import { db } from "./db";

export const SETTING_DEFAULTS: Record<string, string> = {
  storeName: "Unic",
  razorpayKeyId: "",
  razorpayKeySecret: "",
  upiVpa: "",
  razorpayMeUrl: "",
  contactEmail: "koustubhrd2005@gmail.com",
  contactEmailChanges: "0",
  announcementText: "",
  contactPhone: "",
  businessAddress: "",
  adminPasswordNote:
    "Default admin credentials: admin@unic.local / Admin@123 — change this password immediately from Admin > Settings.",
};

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const settings: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

export async function setSettings(patch: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(patch)) {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

export async function razorpayConfigured(): Promise<{ keyId: string; keySecret: string } | null> {
  const s = await getSettings();
  if (s.razorpayKeyId && s.razorpayKeySecret) {
    return { keyId: s.razorpayKeyId, keySecret: s.razorpayKeySecret };
  }
  return null;
}
