import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { emailConfigured, generateVerifyCode, codeExpiry } from "@/lib/security";
import { sendMail } from "@/lib/email";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase();
  const code = String(b.code ?? "").trim();
  const resend = Boolean(b.resend);

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  // Failsafe: if email sending is not configured, verification is not enforced.
  if (!emailConfigured()) {
    if (!user.emailVerified) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verifyCode: null, verifyCodeExpires: null },
      });
    }
    return NextResponse.json({ notRequired: true });
  }

  if (resend) {
    const newCode = generateVerifyCode();
    await db.user.update({
      where: { id: user.id },
      data: { verifyCode: newCode, verifyCodeExpires: codeExpiry() },
    });
    await sendMail(
      user.email,
      "Your Unic verification code",
      `Hello ${user.name},\n\nYour new verification code is:\n\n    ${newCode}\n\nIt expires in 15 minutes.`
    );
    return NextResponse.json({ sent: true });
  }

  if (!code) {
    return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
  }

  const valid =
    user.verifyCode !== null &&
    user.verifyCode === code &&
    user.verifyCodeExpires !== null &&
    user.verifyCodeExpires.getTime() > Date.now();

  if (!valid) {
    return NextResponse.json(
      { error: "Invalid or expired code. Use Resend code to get a new one." },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verifyCode: null,
      verifyCodeExpires: null,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
  });
}
