import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalList, LegalPage, LegalSection } from '@/components/legal';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <LegalPage title='Privacy Policy' updated='September 24, 2026'>
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
            address and profile picture, along with sign-in tokens from Discord,
            which we store encrypted. We store your role (viewer, editor or
            admin) and when your account was created. Admins can see the name,
            email address, sign-in methods, likes and activity log entries of
            every account in order to manage accounts. To check what viewers and
            editors see, an admin can temporarily view the site as another
            account (never another admin&rsquo;s). They then see what that
            person sees, including their account settings and sessions, but
            cannot change anything. This is recorded in the activity log.
          </li>
          <li>
            <strong>Sessions:</strong> while you are signed in, we store a
            session with its IP address, browser information and timestamps.
            This keeps you signed in and lets you see and end your sessions in
            your account settings, together with the rough location (country and
            network provider) of each session.
          </li>
          <li>
            <strong>Activity log:</strong> when a plushie or an account changes,
            we record what changed, who changed it and when. For accounts, this
            includes the name, email address, role and whether the email address
            is confirmed, before and after the change, as well as added or
            removed sign-in methods. Passwords are never recorded, only that one
            was changed. Editors and admins can see changes to plushies; only
            admins can see changes to accounts. This helps us notice mistakes
            and misuse.
          </li>
          <li>
            <strong>Bans:</strong> if an admin bans an account, for example for
            misuse, we store the reason, when the ban ends (if it does), which
            admin banned it and when. The account is signed out everywhere and
            cannot sign in until the ban ends or is lifted. When someone tries
            to sign in to a banned account, we show them the reason. Bans and
            lifted bans are recorded in the activity log. We do not ban IP
            addresses.
          </li>
          <li>
            <strong>Likes:</strong> when you like a plushie, we store that your
            account likes it, so each account can like a plushie only once.
            Everyone sees how many likes a plushie has, but only admins can see
            who gave them. Your likes are deleted with your account.
          </li>
          <li>
            <strong>Plushie content:</strong> the names, descriptions and photos
            that editors add. This content is public. Please do not upload
            photos that show people or other personal information.
          </li>
          <li>
            <strong>Emails:</strong> when you sign up with your email address,
            or change it, we send a link to confirm it belongs to you. When you
            change a confirmed address, we first ask you to confirm from the old
            one. If you ask to reset your password, we send an email with a
            reset link, and if you ask to delete your account, we send a link to
            confirm. We store whether your address is confirmed.
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
            <strong>A ban notice cookie</strong> (only after trying to sign in
            to a banned account, for 15 minutes): lets the page that explains
            the ban show its reason to you and no one else.
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
          explicitly use, such as staying signed in, switching the theme or
          seeing why an account is banned (§ 25 (2) no. 2 TDDDG). We use no
          advertising, analytics or other tracking technologies, so there is
          nothing to ask consent for.
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
            <strong>Resend</strong> (Plus Five Five, Inc., USA): sends email
            verification and password reset emails. Resend receives your email
            address, name and the content of the email.
          </li>
          <li>
            <strong>IPinfo</strong> (IPinfo, Inc., USA): when you open your
            account settings, the IP addresses of your sessions are sent to
            IPinfo to look up their country and network provider. Each address
            is looked up at most once a week. Local and private network
            addresses are never sent.
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
          days without use, password reset links expire after one hour, and
          email verification links after 24 hours. Ban details are removed when
          an admin lifts the ban, or when the account next signs in after the
          ban ended. Photos removed from a plushie, or of a deleted plushie, are
          kept on UploadThing for 30 days so the change can be undone, and
          deleted after that. Activity log entries are deleted after 90 days,
          including those about accounts that were deleted before then. Log
          data, if any, is kept only as long as needed for security and
          troubleshooting. Browser storage stays on your device until it expires
          or you clear it.
        </p>
      </LegalSection>

      <LegalSection title='9. Your rights'>
        <p>
          Under the GDPR you have the right of access (Art. 15), rectification
          (Art. 16), erasure (Art. 17), restriction of processing (Art. 18),
          data portability (Art. 20) and objection (Art. 21). You can change
          your name, email address, password and sign-in methods, end your
          sessions and delete your account yourself in your{' '}
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
