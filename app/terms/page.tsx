import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalList, LegalPage, LegalSection } from '@/components/legal';

export const metadata: Metadata = { title: 'Terms of service' };

export default function TermsPage() {
  return (
    <LegalPage title='Terms of service' updated='September 23, 2026'>
      <LegalSection title='1. Scope'>
        <p>
          These terms apply to your use of Plushies, a free website that shows a
          personal plushie collection, operated by the person named in the{' '}
          <Link href='/imprint'>Imprint</Link>. By using the site you agree to
          them.
        </p>
      </LegalSection>

      <LegalSection title='2. The service'>
        <p>
          Anyone can look at the plushies without an account. You can create a
          free account, but new accounts can only look around: an admin decides
          who may edit plushies. It is a hobby project that keeps changing:
          features may be added, changed or removed at any time.
        </p>
      </LegalSection>

      <LegalSection title='3. Your account'>
        <p>
          Keep your password to yourself, and tell us if you think someone else
          has access to your account. You can delete your account at any time in
          your <Link href='/account'>account settings</Link>. We may change
          roles, or suspend or delete accounts, if these terms are broken or an
          account is no longer needed.
        </p>
      </LegalSection>

      <LegalSection title='4. Fair use'>
        <p>Please be nice. You agree not to:</p>
        <LegalList>
          <li>
            use names that are offensive, hateful, unlawful, or that impersonate
            other people;
          </li>
          <li>
            attack, overload, probe or scrape the site, or try to get around
            technical limits or permissions;
          </li>
          <li>use the service for anything unlawful.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title='5. Content from editors'>
        <p>
          If you are an editor, you are responsible for the text and photos you
          add. Only upload photos you took yourself or are allowed to use, and
          do not upload photos that show people or other personal information.
          By adding content, you allow us to store and show it on the site. We
          may edit or remove content at any time.
        </p>
      </LegalSection>

      <LegalSection title='6. Availability'>
        <p>
          The service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;. We do not promise it will be uninterrupted or
          error-free.
        </p>
      </LegalSection>

      <LegalSection title='7. Liability'>
        <p>
          We are fully liable for intent and gross negligence, for injury to
          life, body or health, and where mandatory law requires it. For slight
          negligence we are only liable for breach of essential contractual
          obligations, and then limited to the foreseeable damage typical for
          this kind of service. Any further liability is excluded, which also
          applies to the personal liability of employees and agents.
        </p>
      </LegalSection>

      <LegalSection title='8. Changes to these terms'>
        <p>
          We may update these terms when the service changes. Continuing to use
          Plushies after an update means you accept the new version.
        </p>
      </LegalSection>

      <LegalSection title='9. Governing law'>
        <p>
          German law applies, excluding the UN Convention on Contracts for the
          International Sale of Goods. If you are a consumer, mandatory consumer
          protection rules of the country where you live remain unaffected.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
