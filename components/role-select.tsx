'use client';

import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { setUserRole } from '@/actions/users';
import { roleLabels, roleNames } from '@/lib/permissions';
import { cn } from '@/lib/utils';

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
          try {
            const { error } = await setUserRole(userId, value);
            if (error) toast.error(error);
          } catch {
            toast.error('Something went wrong, try again');
          }
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
