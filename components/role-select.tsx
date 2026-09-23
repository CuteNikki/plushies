'use client';

import { useOptimistic, useTransition } from 'react';

import { roleLabels, roleNames } from '@/lib/permissions';
import { cn } from '@/lib/utils';

import { setUserRole } from '@/app/admin/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function RoleSelect({
  userId,
  role,
  disabled,
  className,
}: {
  userId: string;
  role: string;
  disabled?: boolean;
  className?: string;
}) {
  const [optimisticRole, setOptimisticRole] = useOptimistic(role);
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={optimisticRole}
      disabled={disabled || pending}
      onValueChange={(value) =>
        startTransition(async () => {
          setOptimisticRole(value);
          await setUserRole(userId, value);
        })
      }
    >
      <SelectTrigger className={cn('w-32', className)} aria-label='Role'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roleNames.map((name) => (
          <SelectItem key={name} value={name}>
            {roleLabels[name]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
