import { Children, cloneElement, isValidElement } from 'react';

import { Reveal } from '@/components/motion';

export const operator = {
  name: 'Nikki Sophie Berthold',
  street: 'Friedrich-Karl-Straße 28',
  city: '32584 Löhne',
  country: 'Germany',
  email: 'contact@niso.moe',
  phone: '+49 176 46236314',
};

/** Shared layout for the imprint, privacy policy and terms. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** Shown as "Last updated", e.g. 'September 23, 2026'. */
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className='mx-auto flex max-w-2xl flex-col gap-8'>
      <Reveal as='header' className='flex flex-col gap-1'>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          {title}
        </h1>
        <p className='text-sm text-muted-foreground'>Last updated: {updated}</p>
      </Reveal>
      {/* One after another after the title; sections further down fade in
          when they are scrolled to. */}
      {Children.map(children, (child, index) => {
        const delay = 0.15 + index * 0.1;
        if (
          isValidElement<{ delay?: number }>(child) &&
          child.type === LegalSection
        ) {
          return cloneElement(child, { delay });
        }
        return <Reveal delay={delay}>{child}</Reveal>;
      })}
    </article>
  );
}

export function LegalSection({
  title,
  delay,
  children,
}: {
  title: string;
  /** Set by LegalPage from the section's position. */
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal
      as='section'
      delay={delay}
      className='flex flex-col gap-3 leading-relaxed [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_strong]:font-semibold [&_strong]:text-foreground'
    >
      <h2 className='font-heading text-xl font-semibold'>{title}</h2>
      {children}
    </Reveal>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return (
    <ul className='flex list-disc flex-col gap-2 pl-5 marker:text-primary/60'>
      {children}
    </ul>
  );
}
