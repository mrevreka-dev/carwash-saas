import 'server-only';
import { cookies } from 'next/headers';
import type { SessionPayload } from './session';

/**
 * The "active business" a request operates on.
 *
 * - OWNER / STAFF: always their own businessId (from the session).
 * - SUPER_ADMIN: no home business; they pick one, stored in a cookie
 *   (`cw_active_business`). Many platform screens instead operate across all
 *   businesses and do not need this.
 */
export const ACTIVE_BUSINESS_COOKIE = 'cw_active_business';

export async function getActiveBusinessId(
  session: SessionPayload
): Promise<string | null> {
  if (session.role !== 'SUPER_ADMIN') {
    return session.businessId ?? null;
  }
  const store = await cookies();
  return store.get(ACTIVE_BUSINESS_COOKIE)?.value ?? null;
}

/** Like getActiveBusinessId but throws when no tenant is resolvable. */
export async function requireBusinessId(session: SessionPayload): Promise<string> {
  const id = await getActiveBusinessId(session);
  if (!id) {
    throw new Error('No active business selected for this request');
  }
  return id;
}
