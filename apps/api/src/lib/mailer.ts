import nodemailer from 'nodemailer';

export const CONTACT_INBOX = 'qxicybertech.helpcenter@gmail.com';

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
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) return null;
  const user = process.env.GMAIL_USER ?? CONTACT_INBOX;
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return gmailTransporter;
}

function getOutboundFrom() {
  return process.env.GMAIL_USER ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? CONTACT_INBOX;
}

function getOutboundMailer() {
  return getGmailTransporter() ?? getTransporter();
}

export async function sendWelcomeInvite(input: {
  to: string;
  name: string;
  role: string;
  tempPassword: string;
  orgName?: string;
}): Promise<{ sent: boolean; preview?: string }> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@brightpath.ai';
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  const subject = `Welcome to BrightPath${input.orgName ? ` — ${input.orgName}` : ''}`;
  const text = `Hi ${input.name},

Your BrightPath ${input.role} account is ready.

Email: ${input.to}
Temporary password: ${input.tempPassword}

Sign in at: ${appUrl}/login

Please change your password after first login.

— BrightPath`;

  const mailer = getTransporter();
  if (!mailer) {
    console.log('[email:welcome]', { to: input.to, subject, text });
    return { sent: false, preview: text };
  }

  await mailer.sendMail({ from, to: input.to, subject, text });
  return { sent: true };
}

export async function sendContactInquiry(input: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const mailer = getOutboundMailer();
  if (!mailer) {
    throw new MailerUnconfiguredError();
  }

  const fromUser = getOutboundFrom();
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

export async function sendNewsletterSubscription(email: string): Promise<void> {
  const mailer = getOutboundMailer();
  if (!mailer) {
    throw new MailerUnconfiguredError();
  }

  const fromUser = getOutboundFrom();
  const inbox = process.env.CONTACT_INBOX ?? CONTACT_INBOX;
  const safeEmail = escapeHtml(email);

  await mailer.sendMail({
    from: `"MindVault" <${fromUser}>`,
    to: email,
    subject: 'Welcome to MindVault Updates!',
    text: `Welcome to MindVault!\n\nThank you for subscribing. You'll receive the latest AI education insights, feature updates, and classroom tools.\n\nQuestions? Email ${inbox}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #06b6d4; font-size: 28px; margin-bottom: 16px;">Welcome to MindVault!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #94a3b8;">
          Thank you for subscribing! You're now on the list to receive the latest AI education insights, platform feature updates, and interactive classroom tools directly in your inbox.
        </p>
        <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; border-left: 4px solid #06b6d4; margin: 24px 0;">
          <p style="margin: 0; color: #ffffff; font-weight: bold;">What's next?</p>
          <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 14px;">We share periodic updates on how AI is shaping classroom tools and learning platforms. No spam, ever.</p>
        </div>
        <p style="font-size: 14px; color: #64748b; margin-top: 32px;">
          If you have any questions, reply to this email or reach us at <a href="mailto:${inbox}" style="color: #38bdf8;">${inbox}</a>.
        </p>
      </div>
    `,
  });

  await mailer.sendMail({
    from: `"MindVault Newsletter" <${fromUser}>`,
    to: inbox,
    subject: `New Newsletter Subscriber: ${email.replace(/[\r\n]+/g, ' ').slice(0, 120)}`,
    text: `New user subscribed to MindVault newsletter: ${email}`,
    html: `<p>New MindVault newsletter subscriber: <a href="mailto:${safeEmail}">${safeEmail}</a></p>`,
  });
}
