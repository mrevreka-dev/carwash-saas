import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@prisma/client';

export const SESSION_COOKIE = 'cw_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: Role;
  businessId: string | null;
  [key: string]: unknown;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as SessionPayload;
}

export const SESSION_MAX_AGE = MAX_AGE;
