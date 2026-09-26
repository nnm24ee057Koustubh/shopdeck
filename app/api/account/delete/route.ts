import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { getSession, destroySession } from "@/lib/session";

// POST /api/account/delete
// Four independent verifications, all re-checked on the server:
//   1. correct account password
//   2. customer types their exact account email
//   3. customer types the word DELETE
//   4. explicit acknowledgment flag
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const password = String(b.password ?? "");
  const emailConfirmation = String(b.emailConfirmation ?? "").trim().toLowerCase();
  const confirmText = String(b.confirmText ?? "").trim();
  const acknowledged = b.acknowledged === true;

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  // The owner (admin) account can never be deleted — it runs the store.
  if (user.role === "ADMIN") {
    return NextResponse.json(
      { error: "The owner account cannot be deleted — it manages the store." },
      { status: 403 }
    );
  }

  // Verification 1: password
  if (!password || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Password is incorrect." }, { status: 400 });
  }
  // Verification 2: exact email match
  if (emailConfirmation !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "The email you typed does not match this account." },
      { status: 400 }
    );
  }
  // Verification 3: typed DELETE
  if (confirmText !== "DELETE") {
    return NextResponse.json(
      { error: 'Please type DELETE exactly to confirm.' },
      { status: 400 }
    );
  }
  // Verification 4: explicit acknowledgment
  if (!acknowledged) {
    return NextResponse.json({ error: "Please tick the final acknowledgment box." }, { status: 400 });
  }

  // Anonymize the account: personal data is erased, order history stays for
  // the store's money records (industry-standard account deletion practice).
  await db.review.deleteMany({ where: { userId: user.id } });
  await db.user.update({
    where: { id: user.id },
    data: {
      email: `deleted-${user.id}-${Date.now()}@unic.local`,
      name: "Deleted Customer",
      phone: null,
      passwordHash: hashPassword(randomBytes(24).toString("hex")),
      emailVerified: false,
      verifyCode: null,
      verifyCodeExpires: null,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  await destroySession();

  return NextResponse.json({ ok: true });
}
