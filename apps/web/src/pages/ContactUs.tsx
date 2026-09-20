import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin } from 'lucide-react';

const CONTACT_EMAIL = 'qxicybertech.helpcenter@gmail.com';
const BACK_CLASS =
  'bp-auth-back mb-6 inline-flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-800/60 px-4 py-2 text-lg font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200 hover:-translate-x-1 hover:border-cyan-400 hover:bg-slate-800 hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]';
const fieldClass =
  'w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-lg text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500';

export default function ContactUs() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bp-contact flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-slate-200 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl md:p-12">
        <div>
          <Link to="/" className={BACK_CLASS}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Contact Us</h1>
          <p className="mt-2 text-lg text-slate-400">
            Have questions or need assistance? Reach out to our support team.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-2">
          <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 md:p-8">
            <h2 className="border-b border-slate-800 pb-3 text-2xl font-bold text-white">Get in Touch</h2>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-cyan-400">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Email Us</h3>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="break-all text-lg font-bold text-white transition-colors hover:text-cyan-400"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-cyan-400">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Office Address</h3>
                <p className="mt-1 text-lg font-medium leading-relaxed text-white">
                  130, 1st 7th cross Teachers layout,
                  <br />
                  Nagarabhavi, Bangalore, 560072
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Send a Message</h2>
            {submitted ? (
              <div
                className="rounded-2xl border border-emerald-500/40 bg-emerald-950/60 p-6 text-lg font-semibold text-emerald-300"
                role="status"
              >
                Thank you for reaching out! We will get back to you shortly.
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="mb-1 block text-lg font-semibold text-white">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder="Your full name"
                    className={fieldClass}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1 block text-lg font-semibold text-white">
                    Your Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    placeholder="you@school.edu"
                    className={fieldClass}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1 block text-lg font-semibold text-white">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    placeholder="How can we help you?"
                    className={`${fieldClass} resize-none`}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-cyan-500 py-3.5 text-lg font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
