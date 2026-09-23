import 'server-only';

import { Resend } from 'resend';

async function sendEmail(email: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  // Created here, not at import, so builds work without the API key.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    ...email,
    // A unique value stops Gmail from grouping emails with the same subject
    // into one conversation, where it hides the repeated text behind "…".
    headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  url: string
) {
  await sendEmail({
    to,
    subject: 'Reset your Plushies password',
    text: `Hi ${name},\n\nSomeone (hopefully you) asked to reset your password. Open this link to choose a new one:\n\n${url}\n\nThe link works for one hour. If you didn't ask for this, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Someone (hopefully you) asked to reset your password. Click the link below to choose a new one:</p>
<p><a href="${url}">Reset my password</a></p>
<p>The link works for one hour. If you didn't ask for this, you can ignore this email.</p>`,
  });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  url: string,
  /** True for the last step of changing an email address. */
  changing = false
) {
  const ignore = changing
    ? "If you didn't ask to change your email, you can ignore this email."
    : "If you didn't create an account, you can ignore this email.";
  await sendEmail({
    to,
    subject: changing
      ? 'Confirm your new email for Plushies'
      : 'Verify your email for Plushies',
    text: `Hi ${name},\n\nPlease confirm this is your email address by opening this link:\n\n${url}\n\nThe link works for 24 hours. ${ignore}`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Please confirm this is your email address by clicking the link below:</p>
<p><a href="${url}">Verify my email</a></p>
<p>The link works for 24 hours. ${ignore}</p>`,
  });
}

/** First step of changing a verified email: sent to the current address. */
export async function sendEmailChangeConfirmation(
  to: string,
  name: string,
  newEmail: string,
  url: string
) {
  await sendEmail({
    to,
    subject: 'Confirm your email change for Plushies',
    text: `Hi ${name},\n\nSomeone (hopefully you) asked to change the email address of your Plushies account to ${newEmail}. Open this link to confirm, and we'll send a last link to the new address:\n\n${url}\n\nThe link works for 24 hours. If you didn't ask for this, ignore this email and consider changing your password.`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Someone (hopefully you) asked to change the email address of your Plushies account to <strong>${escapeHtml(newEmail)}</strong>. Click the link below to confirm, and we'll send a last link to the new address:</p>
<p><a href="${url}">Confirm the change</a></p>
<p>The link works for 24 hours. If you didn't ask for this, ignore this email and consider changing your password.</p>`,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
