import type { OrganizationRole } from '@/shared/api';
import { isOrganizationRole } from '@/shared/api';

const organizationPermissions = {
  'members.invite': ['owner', 'admin'],
  'members.remove': ['owner', 'admin'],
  'members.changeRole': ['owner', 'admin'],
} as const satisfies Record<string, ReadonlyArray<OrganizationRole>>;

type OrganizationPermission = keyof typeof organizationPermissions;

function hasOrganizationPermission(
  role: string,
  permission: OrganizationPermission,
) {
  if (!isOrganizationRole(role)) {
    return false;
  }

  const allowedRoles: ReadonlyArray<OrganizationRole> =
    organizationPermissions[permission];

  return allowedRoles.includes(role);
}

export { hasOrganizationPermission, organizationPermissions };
export type { OrganizationPermission };
