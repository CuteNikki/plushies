'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/lib/auth-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (!String(formData.get('name')).trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (String(formData.get('name')).trim() === name) {
      toast.error('Name is the same as the current one');
      return;
    }

    setPending(true);
    const { error } = await authClient.updateUser({
      name: String(formData.get('name')).trim(),
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? 'Something went wrong');
      return;
    }
    toast.success('Name saved');
    router.refresh();
  }

  return (
    <form action={handleSubmit} className='flex items-end gap-2'>
      <div className='flex flex-1 flex-col gap-1'>
        <Label htmlFor='name'>Name</Label>
        <Input
          id='name'
          name='name'
          required
          defaultValue={name}
          autoComplete='name'
        />
      </div>
      <Button type='submit' disabled={pending}>
        {pending && <Loader2 className='animate-spin' />}
        Save
      </Button>
    </form>
  );
}
