import { BackButton } from '@/components/back-button';
import { Reveal } from '@/components/motion';

/**
 * The top of a page under someone's, e.g. all their comments: back to
 * theirs, and what this one lists.
 */
export function UserSubpageHeader({
  user,
  title,
  description,
}: {
  user: { id: string; name: string };
  title: string;
  description?: string;
}) {
  return (
    <>
      <Reveal className='flex'>
        <BackButton href={`/dashboard/users/${user.id}`}>
          {user.name}
        </BackButton>
      </Reveal>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight wrap-break-word'>
          {title}
        </h1>
        {description && (
          <p className='text-pretty text-muted-foreground'>{description}</p>
        )}
      </Reveal>
    </>
  );
}
