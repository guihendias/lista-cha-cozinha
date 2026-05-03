import { cookies } from "next/headers";

const COOKIE_NAME = "admin-session";
const ONE_WEEK = 60 * 60 * 24 * 7;

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(password, expected);
}

export async function getSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  if (!secret || !password) {
    throw new Error("SESSION_SECRET and ADMIN_PASSWORD must be set");
  }
  return hmac(password, secret);
}

export async function setSessionCookie(): Promise<void> {
  const token = await getSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_WEEK,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return false;
  try {
    const expected = await getSessionToken();
    return timingSafeEqual(cookie.value, expected);
  } catch {
    return false;
  }
}

export async function verifySessionCookieValue(value: string): Promise<boolean> {
  try {
    const expected = await getSessionToken();
    return timingSafeEqual(value, expected);
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
