import { randomInt } from "node:crypto";

// Security layer 1: password strength rules.
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "Password must contain both letters and numbers.";
  }
  return null;
}

// Security layer 3: one-time verification codes (OTP).
export function generateVerifyCode(): string {
  return String(randomInt(100000, 1000000));
}

export function codeExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000);
}

export function emailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}
