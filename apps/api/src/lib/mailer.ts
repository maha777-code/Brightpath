import nodemailer from 'nodemailer';

export const CONTACT_INBOX = 'customersupport@mindvault.academy';
export const FEEDBACK_INBOX = 'customersupport@mindvault.academy';
/** Gmail login that GMAIL_APP_PASSWORD belongs to; never shown to users, replies go to CONTACT_INBOX. */
const GMAIL_ACCOUNT = 'qxicybertech.helpcenter@gmail.com';

export class MailerUnconfiguredError extends Error {
  readonly code = 'MAILER_UNCONFIGURED';
  constructor() {
    super('Contact email is not configured.');
    this.name = 'MailerUnconfiguredError';
  }
}

let transporter: nodemailer.Transporter | null = null;
let gmailTransporter: nodemailer.Transporter | null = null;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
  return transporter;
}

function getGmailTransporter() {
  if (gmailTransporter) return gmailTransporter;
  const pass = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, '');
  if (!pass) return null;
  const user = (process.env.GMAIL_USER ?? GMAIL_ACCOUNT).trim();
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return gmailTransporter;
}

function getContactTransporter() {
  return getGmailTransporter() ?? getTransporter();
}

export function isMailConfigured(): boolean {
  return getContactTransporter() !== null;
}

function senderAddress() {
  return process.env.GMAIL_USER ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? GMAIL_ACCOUNT;
}

export async function sendVerificationCodeEmail(input: { to: string; name?: string | null; code: string }): Promise<void> {
  const mailer = getContactTransporter();
  if (!mailer) throw new MailerUnconfiguredError();
  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : 'Hi,';
  await mailer.sendMail({
    from: `"MindVault" <${senderAddress()}>`,
    replyTo: CONTACT_INBOX,
    to: input.to,
    subject: `${input.code} is your MindVault verification code`,
    text: [
      greeting,
      '',
      `Your MindVault verification code is ${input.code}`,
      '',
      'Enter it on the sign-up page to finish creating your account. The code expires in 15 minutes.',
      '',
      'If you did not try to sign up, you can ignore this email; no account will be created.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px; max-width: 520px;">
        <p>${escapeHtml(greeting)}</p>
        <p>Your MindVault verification code is</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0e7490; margin: 8px 0 16px;">${escapeHtml(input.code)}</p>
        <p>Enter it on the sign-up page to finish creating your account. The code expires in 15 minutes.</p>
        <p style="color: #475569; font-size: 13px;">If you did not try to sign up, you can ignore this email; no account will be created.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name?: string | null;
  link: string;
  expiresInMinutes: number;
}): Promise<void> {
  const mailer = getContactTransporter();
  if (!mailer) throw new MailerUnconfiguredError();
  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : 'Hi,';
  await mailer.sendMail({
    from: `"MindVault" <${senderAddress()}>`,
    replyTo: CONTACT_INBOX,
    to: input.to,
    subject: 'Reset your MindVault password',
    text: [
      greeting,
      '',
      'We received a request to reset the password for your MindVault account.',
      '',
      `Open this link to choose a new password: ${input.link}`,
      '',
      `The link expires in ${input.expiresInMinutes} minutes and works once.`,
      '',
      'If you did not ask for this, you can ignore this email; your password will not change.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px; max-width: 560px;">
        <p>${escapeHtml(greeting)}</p>
        <p>We received a request to reset the password for your MindVault account.</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(input.link)}" style="background: #0e7490; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Choose a new password</a>
        </p>
        <p>The link expires in ${input.expiresInMinutes} minutes and works once.</p>
        <p style="color: #475569; font-size: 13px;">If you did not ask for this, you can ignore this email; your password will not change.</p>
      </div>
    `,
  });
}

export async function sendAccountInviteEmail(input: {
  to: string;
  name: string;
  role: 'student' | 'teacher';
  link: string;
  inviterName?: string | null;
  orgName?: string | null;
  className?: string | null;
}): Promise<void> {
  const mailer = getContactTransporter();
  if (!mailer) throw new MailerUnconfiguredError();
  const where = input.className
    ? `${input.className}${input.orgName ? ` at ${input.orgName}` : ''}`
    : input.orgName ?? 'MindVault';
  const who = input.inviterName?.trim() || (input.orgName ? input.orgName : 'Your teacher');
  const line = `${who} invited you to join ${where} on MindVault as a ${input.role}.`;
  await mailer.sendMail({
    from: `"MindVault" <${senderAddress()}>`,
    replyTo: CONTACT_INBOX,
    to: input.to,
    subject: `You're invited to ${where} on MindVault`,
    text: [
      `Hi ${input.name},`,
      '',
      line,
      '',
      `Open this link to confirm your email and set your password: ${input.link}`,
      '',
      'The link expires in 14 days. If you were not expecting this, you can ignore it; no account is created until you accept.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px; max-width: 560px;">
        <p>Hi ${escapeHtml(input.name)},</p>
        <p>${escapeHtml(line)}</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(input.link)}" style="background: #0e7490; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept invite and set password</a>
        </p>
        <p style="color: #475569; font-size: 13px;">The link expires in 14 days. If you were not expecting this, you can ignore it; no account is created until you accept.</p>
      </div>
    `,
  });
}

export async function sendContactInquiry(input: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const mailer = getContactTransporter();
  if (!mailer) {
    throw new MailerUnconfiguredError();
  }

  const fromUser = senderAddress();
  const inbox = process.env.CONTACT_INBOX ?? CONTACT_INBOX;
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeMessage = escapeHtml(input.message).replace(/\r\n|\r|\n/g, '<br/>');
  const subjectName = input.name.replace(/[\r\n]+/g, ' ').slice(0, 120);

  await mailer.sendMail({
    from: `"MindVault Contact Form" <${fromUser}>`,
    to: inbox,
    replyTo: input.email,
    subject: `New Support Inquiry from ${subjectName}`,
    text: `New message from the MindVault contact form\n\nName: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #0f172a; color: #ffffff; padding: 30px; border-radius: 12px;">
        <h2 style="color: #06b6d4; margin-bottom: 20px;">New Message from MindVault Contact Form</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>User Email:</strong> <a href="mailto:${safeEmail}" style="color: #38bdf8;">${safeEmail}</a></p>
        <p><strong>Message:</strong></p>
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4; margin-top: 10px;">
          ${safeMessage}
        </div>
      </div>
    `,
  });
}

export async function sendProductFeedback(input: {
  userName: string;
  userEmail: string;
  userRole: string;
  rating: number;
  category: string;
  comments: string;
  pageUrl: string;
}): Promise<void> {
  const mailer = getContactTransporter();
  if (!mailer) {
    throw new MailerUnconfiguredError();
  }

  const fromUser = senderAddress();
  const inbox = process.env.FEEDBACK_INBOX?.trim() || FEEDBACK_INBOX;
  const safeName = escapeHtml(input.userName);
  const safeEmail = escapeHtml(input.userEmail);
  const safeRole = escapeHtml(input.userRole);
  const safeCategory = escapeHtml(input.category);
  const safePage = escapeHtml(input.pageUrl);
  const message = input.comments.trim() || 'No detailed message provided.';
  const safeMessage = escapeHtml(message).replace(/\r\n|\r|\n/g, '<br/>');
  const stars = '⭐'.repeat(input.rating);
  const subjectCategory = input.category.replace(/[\r\n]+/g, ' ').slice(0, 80);

  await mailer.sendMail({
    from: `"MindVault Feedback" <${fromUser}>`,
    to: inbox,
    replyTo: input.userEmail,
    subject: `[MindVault Feedback] ${subjectCategory} - ${input.rating} Stars`,
    text: [
      'New feedback received',
      '',
      `User: ${input.userName} (${input.userEmail})`,
      `Role: ${input.userRole}`,
      `Rating: ${stars} (${input.rating}/5)`,
      `Feedback type: ${input.category}`,
      `Page: ${input.pageUrl}`,
      '',
      'Thoughts:',
      message,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; background: #0f172a; color: #ffffff; padding: 30px; border-radius: 12px;">
        <h2 style="color: #06b6d4; margin-bottom: 20px;">New Feedback Received</h2>
        <p><strong>User:</strong> ${safeName} (<a href="mailto:${safeEmail}" style="color: #38bdf8;">${safeEmail}</a>)</p>
        <p><strong>Role:</strong> ${safeRole}</p>
        <p><strong>Rating:</strong> ${stars} (${input.rating}/5)</p>
        <p><strong>Feedback Type:</strong> ${safeCategory}</p>
        <p><strong>Page:</strong> ${safePage}</p>
        <p><strong>Thoughts/Message:</strong></p>
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4; margin-top: 10px;">
          ${safeMessage}
        </div>
      </div>
    `,
  });
}

const ALERT_LABEL: Record<string, string> = {
  distress: 'Possible distress or self-harm',
  harm: 'Possible threat of harm',
  inappropriate: 'Inappropriate content',
  academic_dishonesty: 'Possible academic dishonesty',
};

/** Returns false when no mail transport is configured; alerts still show on the dashboard. */
export async function sendSafetyAlertEmail(input: {
  to: string[];
  studentName: string;
  category: string;
  reason: string;
  excerpt: string;
}): Promise<boolean> {
  const mailer = getContactTransporter();
  if (!mailer || input.to.length === 0) {
    console.warn('[email:safety-alert] not sent (mail not configured)', { category: input.category });
    return false;
  }
  const fromUser = senderAddress();
  const appUrl = (process.env.APP_URL ?? 'https://mindvault.academy').replace(/\/+$/, '');
  const label = ALERT_LABEL[input.category] ?? 'Safety alert';
  const link = `${appUrl}/sharada-oversight`;
  await mailer.sendMail({
    from: `"MindVault Safety Alerts" <${fromUser}>`,
    to: fromUser,
    bcc: input.to,
    subject: `[MindVault] ${label}: ${input.studentName.replace(/[\r\n]+/g, ' ').slice(0, 80)}`,
    text: [
      `${label} in a Sharada conversation.`,
      '',
      `Student: ${input.studentName}`,
      `Why it was flagged: ${input.reason}`,
      `Message excerpt: "${input.excerpt}"`,
      '',
      `Review the full conversation: ${link}`,
      '',
      'Please follow your school’s safeguarding procedure.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px; max-width: 600px;">
        <h2 style="color: #b91c1c; margin: 0 0 12px;">${escapeHtml(label)}</h2>
        <p><strong>Student:</strong> ${escapeHtml(input.studentName)}</p>
        <p><strong>Why it was flagged:</strong> ${escapeHtml(input.reason)}</p>
        <p><strong>Message excerpt:</strong></p>
        <blockquote style="border-left: 4px solid #f87171; margin: 0; padding: 8px 12px; background: #fef2f2;">${escapeHtml(input.excerpt)}</blockquote>
        <p style="margin-top: 20px;"><a href="${link}" style="color: #0e7490; font-weight: bold;">Review the full conversation</a></p>
        <p style="color: #475569; font-size: 13px;">Please follow your school’s safeguarding procedure.</p>
      </div>
    `,
  });
  return true;
}

export async function sendNewsletterSubscription(email: string): Promise<void> {
  const mailer = getContactTransporter();
  if (!mailer) {
    throw new MailerUnconfiguredError();
  }

  const fromUser = senderAddress();
  const inbox = process.env.CONTACT_INBOX ?? CONTACT_INBOX;
  const safeEmail = escapeHtml(email);

  await mailer.sendMail({
    from: `"MindVault" <${fromUser}>`,
    replyTo: CONTACT_INBOX,
    to: email,
    subject: 'Welcome to MindVault Updates!',
    text: 'Thank you for subscribing. You will now receive the latest AI education insights, feature updates, and classroom tools.',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00bcd4; font-size: 24px;">Welcome to MindVault!</h2>
        <p style="color: #cbd5e1; line-height: 1.6;">
          Thank you for subscribing. You'll now receive the latest AI education insights, feature updates, and classroom tools delivered straight to your inbox.
        </p>
      </div>
    `,
  });

  try {
    await mailer.sendMail({
      from: `"MindVault" <${fromUser}>`,
      to: inbox,
      subject: `New newsletter subscriber: ${email.replace(/[\r\n]+/g, ' ').slice(0, 120)}`,
      text: `${email} subscribed to MindVault updates.`,
      html: `<p style="font-family: Arial, sans-serif;">New subscriber: <a href="mailto:${safeEmail}">${safeEmail}</a></p>`,
    });
  } catch (error) {
    console.error('[newsletter] inbox notify failed:', error);
  }
}
