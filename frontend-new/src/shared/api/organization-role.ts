const organizationRoles = ['owner', 'admin', 'member'] as const;

type OrganizationRole = (typeof organizationRoles)[number];

function isOrganizationRole(role: string): role is OrganizationRole {
  return organizationRoles.includes(role as OrganizationRole);
}

export { isOrganizationRole, organizationRoles };
export type { OrganizationRole };
