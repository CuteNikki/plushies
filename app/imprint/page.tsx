import { Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';

import { LegalPage, LegalSection, operator } from '@/components/legal';

export const metadata: Metadata = { title: 'Imprint' };

export default function ImprintPage() {
  return (
    <LegalPage title='Imprint' updated='September 23, 2026'>
      <address className='flex flex-col gap-3 rounded-xl bg-muted/60 p-4 not-italic ring-1 ring-foreground/5'>
        <span className='flex flex-col'>
          <span className='font-heading font-semibold'>{operator.name}</span>
          <span>{operator.street}</span>
          <span>{operator.city}</span>
          <span>{operator.country}</span>
        </span>
        <span className='flex flex-col gap-1 text-sm'>
          <a
            href={`mailto:${operator.email}`}
            className='flex w-fit items-center gap-2 hover:text-primary'
          >
            <Mail className='size-4 text-primary' />
            {operator.email}
          </a>
          <a
            href={`tel:${operator.phone.replaceAll(' ', '')}`}
            className='flex w-fit items-center gap-2 hover:text-primary'
          >
            <Phone className='size-4 text-primary' />
            {operator.phone}
          </a>
        </span>
      </address>

      <LegalSection title='1. Operator'>
        <p>
          This website is operated by the person named above. Contact them using
          the details above.
        </p>
      </LegalSection>

      <LegalSection title='2. Responsible for content'>
        <p>
          The person named above is responsible for the content of this website
          pursuant to § 18 (2) MStV.
        </p>
      </LegalSection>

      <LegalSection title='3. Liability for content'>
        <p>
          As a service provider we are responsible for our own content on these
          pages under general law. Under §§ 8 to 10 DDG we are not obliged to
          monitor transmitted or stored third-party information, such as the
          names people choose for their accounts. If we become aware of a
          violation of the law, we will remove the content promptly.
        </p>
      </LegalSection>

      <LegalSection title='4. External links'>
        <p>
          This site links to external websites, such as Discord for signing in.
          We have no influence over their content and accept no liability for
          it. The respective provider is always responsible. If we learn of a
          violation, we will remove the link promptly.
        </p>
      </LegalSection>

      <LegalSection title='5. Trademarks and independence'>
        <p>
          Plushies shown on this site may be products or characters whose names
          are trademarks of their respective owners, such as IKEA. They are
          named only to describe the plushies. This is a personal hobby project
          and is not affiliated with, endorsed by, or connected to any of them.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
