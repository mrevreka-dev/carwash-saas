import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from './auth';
import { getActiveBusinessId } from './tenant';
import type { SessionPayload } from './session';

export interface PageContext {
  session: SessionPayload;
  businessId: string | null; // null when a SUPER_ADMIN has not picked one
  locale: string;
}

/** Resolve the common context every dashboard page needs. */
export async function getPageContext(locale: string): Promise<PageContext> {
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const businessId = await getActiveBusinessId(session);
  return { session, businessId, locale };
}

/**
 * Context for tenant-scoped operational pages (customers, appointments,
 * finance, …). The platform SUPER_ADMIN has no operational role inside a single
 * tenant, so they are redirected to the operator console.
 */
export async function guardTenantPage(locale: string): Promise<PageContext> {
  const ctx = await getPageContext(locale);
  if (ctx.session.role === 'SUPER_ADMIN') redirect(`/${locale}/businesses`);
  return ctx;
}
