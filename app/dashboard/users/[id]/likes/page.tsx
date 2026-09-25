import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HeartIcon } from 'lucide-react';

import { getUserLikes, getUserName, LIKES_PAGE_SIZES } from '@/data/users';
import { pageNumber, pageSize, plainQuery } from '@/lib/list-params';
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
  const searchParams = await props.searchParams;
  const query = plainQuery(searchParams);
  const page = pageNumber(searchParams.page);
  const [user, { plushies, total }] = await Promise.all([
    getUserName(id),
    getUserLikes(id, page, pageSize(searchParams.per, LIKES_PAGE_SIZES)),
  ]);
  if (!user) notFound();

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
        query={query}
        page={page}
        total={total}
        sizes={LIKES_PAGE_SIZES}
      />
    </div>
  );
}
