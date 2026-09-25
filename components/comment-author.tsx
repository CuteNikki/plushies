import Link from 'next/link';

/** The comment's author, linked to their user page for admins. */
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
    <Link
      href={`/dashboard/users/${author.id}`}
      className='font-semibold text-foreground hover:underline'
    >
      {author.name}
    </Link>
  );
}
