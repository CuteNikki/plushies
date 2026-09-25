'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { HeartIcon } from 'lucide-react';

import { toggleLike, type LikeState } from '@/actions/likes';
import { authClient } from '@/lib/auth-client';
import { isViewingAs, VIEWING_AS_MESSAGE } from '@/lib/permissions';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

/**
 * A heart with the like count. The count comes with the page; whether you
 * like it is loaded once you're known to be signed in.
 */
export function LikeButton({
  plushieId,
  slug,
  count,
}: {
  plushieId: string;
  slug: string;
  count: number;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  // Shows their like, but can't change it.
  const viewingAs = isViewingAs(session ?? null);
  const [state, setState] = useState<LikeState>({ liked: false, count });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!userId) return;
    let current = true;
    fetch(`/api/plushies/${plushieId}/like`)
      .then((response) => response.json() as Promise<LikeState>)
      .then((fresh) => current && setState(fresh))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [userId, plushieId]);

  function toggle() {
    if (!userId) {
      router.push(`/sign-in?next=${encodeURIComponent(`/plushies/${slug}`)}`);
      return;
    }
    const before = state;
    // Shown right away; corrected by what the server says.
    setState({
      liked: !before.liked,
      count: before.count + (before.liked ? -1 : 1),
    });
    startTransition(async () => {
      const result = await toggleLike(plushieId);
      setState('error' in result ? before : result);
    });
  }

  const label = `${state.count} ${state.count === 1 ? 'like' : 'likes'}`;
  return (
    <Button
      variant='outline'
      onClick={toggle}
      disabled={pending || viewingAs}
      aria-pressed={state.liked}
      aria-label={`${state.liked ? 'Unlike' : 'Like'} (${label})`}
      title={
        viewingAs ? VIEWING_AS_MESSAGE : userId ? undefined : 'Sign in to like'
      }
      className='shrink-0 gap-1.5 rounded-full'
    >
      <HeartIcon
        className={cn(
          'transition-colors',
          state.liked && 'fill-primary text-primary'
        )}
      />
      {state.count}
    </Button>
  );
}
