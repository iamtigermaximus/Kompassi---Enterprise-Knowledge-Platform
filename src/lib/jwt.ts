// KOMPASSI - Simple JWT sign/verify using Node crypto (no dependencies)

import crypto from "crypto";

const SECRET =
  process.env.JWT_SECRET || "kompassi-dev-insecure-default-change-me";

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
  exp: number;
}

export function signJwt(
  payload: Omit<JwtPayload, "exp">,
  ttlHours = 8
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
  const full = { ...payload, exp };

  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const p = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(`${h}.${p}`)
    .digest("base64url");

  return `${h}.${p}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const [h, p, sig] = token.split(".");
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(`${h}.${p}`)
      .digest("base64url");
    if (sig !== expected) return null;

    const payload = JSON.parse(
      Buffer.from(p, "base64url").toString()
    ) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
