import type {
  AppRole,
  OrganizationPublic,
  OrgType,
  PlanType,
  PlatformUserPublic,
} from '@brightpath/shared';
import type {
  Organization as DbOrg,
  PlatformUser as DbUser,
  ClassBatch as DbBatch,
} from '@prisma/client';
import type { ClassBatchPublic } from '@brightpath/shared';

export type SubscriptionStatusPublic =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'inactive';

export function toPlatformUser(u: DbUser): PlatformUserPublic & {
  subscriptionStatus: SubscriptionStatusPublic;
} {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as AppRole,
    planType: u.planType as PlanType,
    organizationId: u.organizationId,
    teacherId: u.teacherId,
    parentProfileId: u.parentProfileId,
    parentLinkCode: u.parentLinkCode,
    createdAt: u.createdAt.toISOString(),
    subscriptionStatus: (u.subscriptionStatus ?? 'active') as SubscriptionStatusPublic,
  };
}

export function toOrganization(o: DbOrg): OrganizationPublic & {
  subscriptionStatus: SubscriptionStatusPublic;
  primaryColor: string;
  primaryHoverColor: string;
  accentColor: string;
  billingInterval: string | null;
} {
  return {
    id: o.id,
    name: o.name,
    type: o.type as OrgType,
    logoUrl: o.logoUrl,
    planType: o.planType as PlanType,
    maxLicenses: o.maxLicenses,
    adminUserId: o.adminUserId,
    subscriptionStatus: (o.subscriptionStatus ?? 'active') as SubscriptionStatusPublic,
    primaryColor: o.primaryColor ?? '#5B46BA',
    primaryHoverColor: o.primaryHoverColor ?? '#4A3799',
    accentColor: o.accentColor ?? '#0D9488',
    billingInterval: o.billingInterval ?? null,
  };
}

export function toClassBatch(b: DbBatch): ClassBatchPublic {
  return {
    id: b.id,
    name: b.name,
    inviteCode: b.inviteCode,
    teacherId: b.teacherId,
    organizationId: b.organizationId,
  };
}

export function randomCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function uniqueInviteCode(
  exists: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = randomCode(6);
    if (!(await exists(code))) return code;
  }
  return randomCode(8);
}

export function randomPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
