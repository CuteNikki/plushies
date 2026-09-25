import type { Missing } from '@/data/dashboard';

import { Badge } from '@/components/ui/badge';

const labels: Record<Missing, string> = {
  thumbnail: 'No thumbnail',
  photos: 'No gallery photos',
  birthday: 'No birthday',
  species: 'No species',
};

/**
 * What a plushie's page still lacks, one badge each. With `limit`, the rest
 * collapse into a '+2' badge that names them, so the badges stay on one line.
 */
export function MissingBadges({
  missing,
  limit,
}: {
  missing: Missing[];
  limit?: number;
}) {
  const shown = limit === undefined ? missing : missing.slice(0, limit);
  const rest = missing.slice(shown.length).map((item) => labels[item]);
  return (
    <span className='mt-1 flex flex-wrap gap-1'>
      {shown.map((item) => (
        <Badge key={item} variant='outline'>
          {labels[item]}
        </Badge>
      ))}
      {rest.length > 0 && (
        <Badge variant='outline' title={rest.join(', ')}>
          <span aria-hidden>+{rest.length}</span>
          <span className='sr-only'>{rest.join(', ')}</span>
        </Badge>
      )}
    </span>
  );
}
