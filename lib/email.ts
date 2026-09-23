import 'server-only';

import { Resend } from 'resend';

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  url: string
) {
  // Created here, not at import, so builds work without the API key.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Reset your Plushies password',
    text: `Hi ${name},\n\nSomeone (hopefully you) asked to reset your password. Open this link to choose a new one:\n\n${url}\n\nThe link works for one hour. If you didn't ask for this, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Someone (hopefully you) asked to reset your password. Click the link below to choose a new one:</p>
<p><a href="${url}">Reset my password</a></p>
<p>The link works for one hour. If you didn't ask for this, you can ignore this email.</p>`,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
