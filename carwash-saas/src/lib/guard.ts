import 'server-only';
import { getSession } from './auth';
import { assertCan, type Permission } from './rbac';
import { requireBusinessId } from './tenant';
import type { SessionPayload } from './session';

/**
 * Guard for Server Actions: ensures there is a session with the given
 * permission and resolves the active business (tenant) id.
 */
export async function guard(
  permission: Permission
): Promise<{ session: SessionPayload; businessId: string }> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  assertCan(session.role, permission);
  const businessId = await requireBusinessId(session);
  return { session, businessId };
}

/** Guard that only checks the session + permission (no tenant required). */
export async function guardPlatform(
  permission: Permission
): Promise<{ session: SessionPayload }> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  assertCan(session.role, permission);
  return { session };
}
