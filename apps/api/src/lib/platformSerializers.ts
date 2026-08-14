import type {
  OrganizationPublic,
  PlatformUserPublic,
  ClassBatchPublic,
  AppRole,
  PlanType,
  OrgType,
} from '@brightpath/shared';
import type {
  ClassBatch as DbBatch,
  Organization as DbOrg,
  PlatformUser as DbUser,
} from '@prisma/client';

export function toPlatformUser(u: DbUser): PlatformUserPublic {
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
  };
}

export function toOrganization(o: DbOrg): OrganizationPublic {
  return {
    id: o.id,
    name: o.name,
    type: o.type as OrgType,
    logoUrl: o.logoUrl,
    planType: o.planType as PlanType,
    maxLicenses: o.maxLicenses,
    adminUserId: o.adminUserId,
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
