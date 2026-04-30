import type { OrganizationRole } from '@/shared/api';
import { isOrganizationRole } from '@/shared/api';
import { cn } from '@/shared/tailwind/cn';
import { Badge } from '@/shared/ui/badge';

type OrganizationRoleBadgeProps = {
  role: string;
};

const organizationRoleBadgeClassNames = {
  owner: 'bg-green-700 text-secondary-foreground',
  admin: 'bg-blue-700 text-secondary-foreground',
  member: '',
} as const satisfies Record<OrganizationRole, string>;

function OrganizationRoleBadge({ role }: OrganizationRoleBadgeProps) {
  const badgeClassName =
    organizationRoleBadgeClassNames[isOrganizationRole(role) ? role : 'member'];

  return (
    <Badge className={cn('capitalize', badgeClassName)} variant="secondary">
      {role}
    </Badge>
  );
}

export { OrganizationRoleBadge };
