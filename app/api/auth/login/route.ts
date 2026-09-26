import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { emailConfigured, generateVerifyCode, codeExpiry } from "@/lib/security";
import { sendMail } from "@/lib/email";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");

  const user = await db.user.findUnique({ where: { email } });

  // Security layer 2: temporary lockout after repeated failures.
  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      {
        error: `Too many failed attempts. This account is locked for ${mins} more minute${mins === 1 ? "" : "s"}.`,
      },
      { status: 423 }
    );
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    if (user) {
      const attempts = user.failedAttempts + 1;
      await db.user.update({
        where: { id: user.id },
        data:
          attempts >= MAX_FAILED_ATTEMPTS
            ? { failedAttempts: attempts, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) }
            : { failedAttempts: attempts },
      });
    }
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Security layer 3: OTP gate for unverified accounts (only when email sending is configured).
  if (emailConfigured() && !user.emailVerified) {
    const code = generateVerifyCode();
    await db.user.update({
      where: { id: user.id },
      data: { verifyCode: code, verifyCodeExpires: codeExpiry(), failedAttempts: 0 },
    });
    await sendMail(
      user.email,
      "Your Unic login code",
      `Hello ${user.name},\n\nYour verification code is:\n\n    ${code}\n\nIt expires in 15 minutes. Enter it to finish signing in.`
    );
    return NextResponse.json({ needsVerification: true, email: user.email }, { status: 403 });
  }

  await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });
  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
  });
}
