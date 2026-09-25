import type { Missing } from '@/data/dashboard';

import { Badge } from '@/components/ui/badge';

const labels: Record<Missing, string> = {
  thumbnail: 'No thumbnail',
  photos: 'No gallery photos',
  birthday: 'No birthday',
  species: 'No species',
};

/** What a plushie's page still lacks, one badge each. */
export function MissingBadges({ missing }: { missing: Missing[] }) {
  return (
    <span className='mt-1 flex flex-wrap gap-1'>
      {missing.map((item) => (
        <Badge key={item} variant='outline'>
          {labels[item]}
        </Badge>
      ))}
    </span>
  );
}
