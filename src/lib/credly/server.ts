/**
 * Server-side Credly client.
 *
 * Wraps the REST API. Server-only because the API token is a Basic Auth
 * credential that must never reach the browser bundle.
 *
 * References:
 *   - Issue a badge: POST /v1/organizations/{org_id}/badges
 *   - List templates: GET /v1/organizations/{org_id}/badge_templates
 */

import 'server-only';

const CREDLY_BASE = 'https://api.credly.com/v1';

export interface IssueBadgeInput {
  badgeTemplateId: string;
  recipientEmail: string;
  recipientName?: string;
  issuedAt?: string;
  expiresAt?: string;
  suppressNotification?: boolean;
  evidence?: Array<
    | { id?: string; type: 'UrlEvidence'; name: string; value: string; description?: string }
    | { id?: string; type: 'PlainTextEvidence'; title: string; description: string }
    | { id?: string; type: 'KeyValueGroupEvidence'; name: string; values: Array<{ label: string; value: string }> }
  >;
}

export interface IssueBadgeResponse {
  id: string;
  state: string;
  public_url?: string;
  [k: string]: unknown;
}

function getEnv() {
  const token = process.env.CREDLY_API_TOKEN;
  const orgId = process.env.CREDLY_ORG_ID;
  if (!token || !orgId) {
    throw new Error('CREDLY_API_TOKEN and CREDLY_ORG_ID must be set');
  }
  return { token, orgId };
}

function getBaseUrl() {
  return process.env.CREDLY_TEST_MODE === 'true' ? 'https://api.sandbox.credly.com/v1' : CREDLY_BASE;
}

function authHeader(token: string) {
  return 'Basic ' + Buffer.from(`${token}:`).toString('base64');
}

async function credlyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = getEnv();
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Credly ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function issueBadge(input: IssueBadgeInput): Promise<IssueBadgeResponse> {
  const { orgId } = getEnv();
  return credlyFetch<IssueBadgeResponse>(`/organizations/${orgId}/badges`, {
    method: 'POST',
    body: JSON.stringify({
      badge_template_id: input.badgeTemplateId,
      recipient_email: input.recipientEmail,
      issued_at: input.issuedAt ?? new Date().toISOString().slice(0, 10),
      expires_at: input.expiresAt,
      suppress_badge_notification_email: input.suppressNotification ?? false,
      evidence: input.evidence,
    }),
  });
}

export async function getBadge(id: string): Promise<IssueBadgeResponse> {
  const { orgId } = getEnv();
  return credlyFetch<IssueBadgeResponse>(`/organizations/${orgId}/badges/${id}`);
}

export async function listTemplates(): Promise<Array<{ id: string; name: string; [k: string]: unknown }>> {
  const { orgId } = getEnv();
  return credlyFetch(`/organizations/${orgId}/badge_templates`);
}

/** Map our cert level to a Credly template id (env-configured). */
export function templateIdForLevel(level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'): string | null {
  switch (level) {
    case 'Bronze':
      return process.env.CREDLY_TEMPLATE_BRONZE ?? null;
    case 'Silver':
      return process.env.CREDLY_TEMPLATE_SILVER ?? null;
    case 'Gold':
      return process.env.CREDLY_TEMPLATE_GOLD ?? null;
    case 'Platinum':
      return process.env.CREDLY_TEMPLATE_PLATINUM ?? null;
  }
}
