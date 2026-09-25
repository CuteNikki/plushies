import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HeartIcon } from 'lucide-react';

import { getUserLikes, getUserName } from '@/data/users';
import { pageNumber, withQuery } from '@/lib/list-params';
import { requireAdmin } from '@/lib/session';
import { count } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { LikedPlushies } from '@/components/liked-plushies';
import { Reveal } from '@/components/motion';
import { Pagination } from '@/components/pagination';
import { UserSubpageHeader } from '@/components/user-subpage';

export const metadata: Metadata = { title: 'Likes' };

/** Every plushie someone likes, most recently liked first. */
export default async function UserLikesPage(
  props: PageProps<'/dashboard/users/[id]/likes'>
) {
  await requireAdmin();
  const { id } = await props.params;
  const page = pageNumber((await props.searchParams).page);
  const [user, { plushies, total, more }] = await Promise.all([
    getUserName(id),
    getUserLikes(id, page),
  ]);
  if (!user) notFound();
  const pageHref = (page: number) =>
    withQuery(`/dashboard/users/${id}/likes`, {
      page: page > 1 ? String(page) : null,
    });

  return (
    <div className='flex flex-col gap-6'>
      <UserSubpageHeader
        user={user}
        title={`${user.name}’s likes`}
        description={`${count(total, 'plushie')} liked, the latest first.`}
      />
      {plushies.length > 0 ? (
        <Reveal>
          <LikedPlushies plushies={plushies} />
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={HeartIcon}>
            {page > 1 ? 'No more likes.' : 'No likes yet.'}
          </EmptyState>
        </Reveal>
      )}
      <Pagination
        newest={page > 1 ? pageHref(1) : null}
        older={more ? pageHref(page + 1) : null}
        newestLabel='Latest'
        olderLabel='Earlier likes'
      />
    </div>
  );
}
