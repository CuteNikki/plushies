import Link from 'next/link';

import { splitMentions, type MentionTarget } from '@/lib/mentions';

/**
 * Text with its mentions as links to those plushies. Without `targets`, or
 * once a plushie is deleted, a mention is just their name.
 */
export function MentionText({
  text,
  targets,
}: {
  text: string;
  targets?: ReadonlyMap<string, MentionTarget>;
}) {
  return splitMentions(text).map((part, index) => {
    if (typeof part === 'string') return part;
    const target = targets?.get(part.id);
    if (!target) return part.name;
    return (
      <Link
        key={index}
        href={`/plushies/${target.slug}`}
        className='text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary'
      >
        {target.name}
      </Link>
    );
  });
}
