import { NotFoundMessage } from '@/components/not-found-message';

/** For plushie pages whose plushie doesn't exist, or no longer does. */
export default function PlushieNotFound() {
  return (
    <NotFoundMessage
      title="This plushie isn't here"
      text='Maybe they got a new name, or they are hiding under the blankets.'
    />
  );
}
