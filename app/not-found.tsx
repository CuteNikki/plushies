import { NotFoundMessage } from '@/components/not-found-message';

/** For any address that doesn't exist. */
export default function NotFound() {
  return (
    <NotFoundMessage
      title='Hmm, nobody here'
      text="We couldn't find the page you were looking for. It must be hiding under the blankets."
    />
  );
}
