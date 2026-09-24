import {
  HeadingSkeleton,
  LoadingPage,
  SectionSkeleton,
} from '@/components/skeletons';

// Heights measured from the real sections, with a password and two sessions.
export default function AccountLoading() {
  return (
    <LoadingPage className='mx-auto w-full max-w-2xl gap-6'>
      <HeadingSkeleton
        title='Account Settings'
        subtitle='Manage your account settings and preferences.'
      />
      <SectionSkeleton title='Profile' height='h-11' />
      <SectionSkeleton title='Email' height='h-42 sm:h-38' />
      <SectionSkeleton title='Password' height='h-65 xs:h-57 sm:h-43' />
      <SectionSkeleton
        title='Sign-in Methods'
        description='Connect Discord to sign in with it too, whichever way you signed up.'
        height='h-24'
      />
      <SectionSkeleton
        title='Sessions'
        description='Everywhere you are signed in right now.'
        height='h-81 xs:h-65 sm:h-56'
      />
      <SectionSkeleton title='Danger Zone' height='h-33 xs:h-28' />
    </LoadingPage>
  );
}
