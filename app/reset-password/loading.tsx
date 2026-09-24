import { AuthCardSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <AuthCardSkeleton
      title='Choose a new password'
      subtitle='You’ll be signed out everywhere else afterwards.'
      height='h-64'
    />
  );
}
