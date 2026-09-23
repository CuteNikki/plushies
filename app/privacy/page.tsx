import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalList, LegalPage, LegalSection } from '@/components/legal';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <LegalPage title='Privacy policy' updated='September 23, 2026'>
      <LegalSection title='1. Who is responsible'>
        <p>
          The controller within the meaning of the GDPR is the operator named in
          the <Link href='/imprint'>Imprint</Link>. You can reach them with the
          contact details given there, including for any privacy question.
        </p>
      </LegalSection>

      <LegalSection title='2. The short version'>
        <p>
          You can look at all the plushies without an account. Accounts are only
          needed to edit them. There are no ads and no analytics or tracking. We
          do not sell personal data and we do not build profiles.
        </p>
      </LegalSection>

      <LegalSection title='3. What we process, and why'>
        <p>
          The legal basis is Art. 6 (1) (b) GDPR, as far as it is needed to
          provide the account and features you asked for, and otherwise Art. 6
          (1) (f) GDPR, our legitimate interest in operating and securing the
          site.
        </p>
        <LegalList>
          <li>
            <strong>Account data:</strong> your name, email address, and a
            securely hashed password if you set one. If you sign in with
            Discord, we also receive your Discord account ID, username, email
            address and profile picture. We store your role (viewer, editor or
            admin) and when your account was created. Admins can see the name,
            email address and sign-in methods of every account in order to
            manage roles.
          </li>
          <li>
            <strong>Sessions:</strong> while you are signed in, we store a
            session with its IP address, browser information and timestamps.
            This keeps you signed in and lets you see and end your sessions in
            your account settings.
          </li>
          <li>
            <strong>Plushie content:</strong> the names, descriptions and photos
            that editors add. This content is public. Please do not upload
            photos that show people or other personal information.
          </li>
          <li>
            <strong>Emails:</strong> if you ask to reset your password, we send
            an email with a reset link to your address.
          </li>
          <li>
            <strong>Technical data:</strong> when you visit the site, your IP
            address and request data (such as browser and time of the request)
            are processed by the web server in order to deliver pages and
            protect against abuse. Such data may appear temporarily in server
            logs.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title='4. Cookies and browser storage'>
        <p>
          The site stores the following in your browser. It is only used to
          provide the features you asked for, and contains no tracking
          identifiers:
        </p>
        <LegalList>
          <li>
            <strong>A session cookie</strong> (only when signed in, for up to
            seven days, renewed while you use the site): keeps you signed in.
          </li>
          <li>
            <strong>Local storage theme:</strong> remembers your light, dark or
            system theme choice.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title='5. Why there is no cookie banner'>
        <p>
          The storage above is strictly necessary to provide functions you
          explicitly use, such as staying signed in or switching the theme (§ 25
          (2) no. 2 TDDDG). We use no advertising, analytics or other tracking
          technologies, so there is nothing to ask consent for.
        </p>
      </LegalSection>

      <LegalSection title='6. Services we use'>
        <p>
          We only share data with the following providers, and only as far as
          needed for the purpose described:
        </p>
        <LegalList>
          <li>
            <strong>Discord</strong> (Discord Inc., USA): only if you choose to
            sign in with Discord or connect your Discord account. You are
            redirected to Discord, and Discord&rsquo;s own privacy policy
            applies there. Your Discord profile picture is loaded from
            Discord&rsquo;s servers when it is shown to you.
          </li>
          <li>
            <strong>UploadThing</strong> (Ping Labs, Inc., USA): stores the
            plushie photos. When editors upload photos, their browser sends the
            files directly to UploadThing. Visitors do not contact UploadThing:
            photos are delivered through our own server.
          </li>
          <li>
            <strong>Resend</strong> (Plus Five Five, Inc., USA): sends password
            reset emails. Resend receives your email address, name and the
            content of the email.
          </li>
        </LegalList>
        <p>
          These providers are based in the USA, so data may be transferred
          there. Where required, such transfers are based on the EU-US Data
          Privacy Framework or on the EU Standard Contractual Clauses (Art. 46
          (2) (c) GDPR).
        </p>
        <p>
          Fonts are downloaded when the site is built and served from our own
          domain, so your browser does not contact Google when you visit. We do
          not embed third-party scripts, trackers or social media widgets.
        </p>
      </LegalSection>

      <LegalSection title='7. Hosting'>
        <p>
          The website and its database run on infrastructure operated by the
          operator. Data is only disclosed to others where described above or
          where the law requires it, for example to authorities.
        </p>
      </LegalSection>

      <LegalSection title='8. Retention'>
        <p>
          Account data is kept until you delete your account, or an admin
          deletes it. Deleting your account also removes your sessions and
          connected sign-in methods right away. Sessions end after at most seven
          days without use, and password reset links expire after one hour.
          Plushie photos are deleted from UploadThing when they are removed from
          a plushie. Log data, if any, is kept only as long as needed for
          security and troubleshooting. Browser storage stays on your device
          until it expires or you clear it.
        </p>
      </LegalSection>

      <LegalSection title='9. Your rights'>
        <p>
          Under the GDPR you have the right of access (Art. 15), rectification
          (Art. 16), erasure (Art. 17), restriction of processing (Art. 18),
          data portability (Art. 20) and objection (Art. 21). You can change
          your name, password and sign-in methods, end your sessions and delete
          your account yourself in your{' '}
          <Link href='/account'>account settings</Link>. For anything else,
          contact us using the details in the{' '}
          <Link href='/imprint'>Imprint</Link>.
        </p>
        <p>
          You also have the right to lodge a complaint with a data protection
          supervisory authority.
        </p>
      </LegalSection>

      <LegalSection title='10. Children'>
        <p>
          Accounts are not aimed at children and we do not knowingly collect
          data from them.
        </p>
      </LegalSection>

      <LegalSection title='11. Changes'>
        <p>
          We may update this policy when the site changes. The date at the top
          shows when it was last updated.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
