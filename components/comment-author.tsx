import Link from 'next/link';

import { UserContextMenu } from '@/components/user-context-menu';

/**
 * The comment's author, linked to their user page for admins, with their
 * account's actions on right-click.
 */
export function CommentAuthor({
  author,
  link,
}: {
  author: { id: string; name: string } | null;
  link: boolean;
}) {
  if (!author) return <>A deleted account</>;
  if (!link) {
    return <span className='font-semibold text-foreground'>{author.name}</span>;
  }
  return (
    <UserContextMenu user={author}>
      <Link
        href={`/dashboard/users/${author.id}`}
        className='font-semibold text-foreground hover:underline'
      >
        {author.name}
      </Link>
    </UserContextMenu>
  );
}
