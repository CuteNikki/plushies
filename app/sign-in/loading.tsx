import { AuthCardSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <AuthCardSkeleton
      title='Welcome!'
      subtitle='Sign in to edit the plushies.'
      height='h-96'
    />
  );
}
