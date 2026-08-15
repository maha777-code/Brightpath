import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

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
