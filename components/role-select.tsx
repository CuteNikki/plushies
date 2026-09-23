'use client';

import { useOptimistic, useTransition } from 'react';

import { roleLabels, roleNames } from '@/lib/permissions';

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
}: {
  userId: string;
  role: string;
  disabled?: boolean;
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
      <SelectTrigger className='w-32' aria-label='Role'>
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
