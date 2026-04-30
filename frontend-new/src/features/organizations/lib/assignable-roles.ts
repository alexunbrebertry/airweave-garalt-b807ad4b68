import type { OrganizationRole } from '@/shared/api';

const assignableOrganizationRoles = [
  'member',
  'admin',
] as const satisfies ReadonlyArray<OrganizationRole>;

type AssignableOrganizationRole = (typeof assignableOrganizationRoles)[number];

export { assignableOrganizationRoles };
export type { AssignableOrganizationRole };
