import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { passwordProblem, generateVerifyCode, codeExpiry, emailConfigured } from "@/lib/security";
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
  const password = String(b.password ?? "");
  const name = String(b.name ?? "").trim();
  const phone = String(b.phone ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const pwProblem = passwordProblem(password);
  if (pwProblem) {
    return NextResponse.json({ error: pwProblem }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  // Security layer 3: email OTP verification (active only when email sending is configured).
  const needsVerification = emailConfigured();
  const verifyCode = needsVerification ? generateVerifyCode() : null;

  const user = await db.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name,
      phone: phone || null,
      role: "CUSTOMER",
      emailVerified: !needsVerification,
      verifyCode,
      verifyCodeExpires: needsVerification ? codeExpiry() : null,
    },
  });

  if (needsVerification) {
    await sendMail(
      user.email,
      "Your Unic verification code",
      `Hello ${user.name},\n\nWelcome to Unic! Your account verification code is:\n\n    ${verifyCode}\n\nThis code expires in 15 minutes. Enter it to activate your account.\n\nIf you did not create this account, you can ignore this email.`
    );
    return NextResponse.json({ needsVerification: true, email: user.email });
  }

  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
  });
}
