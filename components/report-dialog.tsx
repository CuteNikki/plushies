'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { FlagIcon, Loader2Icon } from 'lucide-react';

import { reportComment, reportUser } from '@/actions/reports';
import {
  REPORT_NOTE_MAX,
  reportReasons,
  userReportReasons,
} from '@/lib/report-rules';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** What's being reported: a comment, or someone's account. */
export type ReportTarget =
  | { kind: 'comment'; id: string; authorName: string }
  | { kind: 'user'; id: string; name: string };

/**
 * Asks what's wrong with a comment or an account, with an optional note, and
 * reports it. Open while `target` is set.
 */
export function ReportDialog({
  target: current,
  onReportedAction,
  onCloseAction,
}: {
  target: ReportTarget | null;
  /** Once a comment is reported; `hidden` if that was enough to hide it. */
  onReportedAction: (id: string, hidden: boolean) => void;
  onCloseAction: () => void;
}) {
  const id = useId();
  // The last one, so its text stays while the dialog animates out.
  const [target, setTarget] = useState(current);
  if (current && current !== target) setTarget(current);
  const reasons = target?.kind === 'user' ? userReportReasons : reportReasons;
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function close() {
    onCloseAction();
    // After it animates out, so the form doesn't empty while still showing.
    setTimeout(() => {
      setReason(null);
      setNote('');
      setError(undefined);
    }, 200);
  }

  function send() {
    if (!target) return;
    if (!reason) return setError('Pick what’s wrong');
    startTransition(async () => {
      if (target.kind === 'comment') {
        const result = await reportComment(target.id, { reason, note });
        if (!result.ok) return setError(result.error);
        onReportedAction(target.id, result.hidden);
      } else {
        const result = await reportUser(target.id, { reason, note });
        if (!result.ok) return setError(result.error);
      }
      toast.success('Thanks, an editor will take a look');
      close();
    });
  }

  return (
    <Dialog open={!!current} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target?.kind === 'user'
              ? `Report ${target.name}`
              : `Report ${target?.authorName}’s comment`}
          </DialogTitle>
          <DialogDescription>
            An editor will look at it. Only editors and admins see who reported
            it.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          className='flex flex-col gap-4'
        >
          <fieldset className='flex flex-col gap-2'>
            <legend className='sr-only'>What’s wrong</legend>
            {Object.entries(reasons).map(([value, option]) => (
              // The whole card picks it, and shows once it's picked.
              <label
                key={value}
                className='flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50 has-checked:bg-primary/10 has-checked:ring-primary/40'
              >
                <input
                  type='radio'
                  name='reason'
                  value={value}
                  checked={reason === value}
                  onChange={() => {
                    setReason(value);
                    setError(undefined);
                  }}
                  className='mt-0.5 accent-primary'
                />
                <span className='flex flex-col gap-0.5'>
                  <span className='text-sm font-medium'>{option.label}</span>
                  <span className='text-xs text-pretty text-muted-foreground'>
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className='flex flex-col gap-1'>
            <Label htmlFor={`${id}-note`}>
              Anything to add?{' '}
              <span className='font-normal text-muted-foreground'>
                (optional)
              </span>
            </Label>
            <Textarea
              id={`${id}-note`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={REPORT_NOTE_MAX}
              placeholder={
                reason === 'OTHER' ? 'What’s wrong with it?' : undefined
              }
            />
          </div>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={close}>
              Cancel
            </Button>
            <Button type='submit' disabled={pending}>
              {pending ? (
                <Loader2Icon className='animate-spin' />
              ) : (
                <FlagIcon />
              )}
              Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
