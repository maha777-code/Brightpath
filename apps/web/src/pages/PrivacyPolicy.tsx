import { Link } from 'react-router-dom';
import { PolicyLayout } from '@/components/PolicyLayout';

const CONTACT_EMAIL = 'qxicybertech.helpcenter@gmail.com';

export default function PrivacyPolicy() {
  return (
    <PolicyLayout lastUpdated="October 2026" title="Privacy Policy">
      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          1. Introduction & Core Commitment
        </h2>
        <p>
          At MindVault, we prioritize data privacy and transparency for educators, students, and
          educational institutions. Our platform is engineered specifically for education, ensuring
          strictly regulated data practices in full compliance with global standards including FERPA
          and COPPA.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          2. AI Data Protection & Zero Retention
        </h2>
        <p>We know how important content confidentiality is when using AI models in learning environments.</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-300">
          <li>
            <strong className="text-white">No Model Training:</strong> Your prompts, inputs, and
            educational outputs are never used to train external artificial intelligence or large
            language models (LLMs).
          </li>
          <li>
            <strong className="text-white">Zero Data Retention (ZDR):</strong> Third-party AI
            providers connected to MindVault operate under strict contractual Zero Data Retention
            terms, deleting transient request data immediately upon generating responses.
          </li>
          <li>
            <strong className="text-white">No Profiling or Targeted Ads:</strong> Student data is
            never processed for commercial profiling, targeted advertising, or behavioral
            monetization.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          3. Information We Collect
        </h2>
        <p>We only collect data strictly necessary to provide and secure our educational service:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-300">
          <li>
            <strong className="text-white">Account Information:</strong> Institutional or personal
            email address, name, user status (teacher, administrator, parent, or student), school or
            organization name, and account preferences. Students may provide a date of birth so we
            can tailor curriculum by age group.
          </li>
          <li>
            <strong className="text-white">Educational Inputs:</strong> User-submitted prompts, lesson
            plans, assignment workflows, and tutor conversations required to generate requested
            content.
          </li>
          <li>
            <strong className="text-white">Technical & Usage Data:</strong> Anonymized log metrics,
            performance diagnostics, browser type, and essential security cookies.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          4. How We Use Information
        </h2>
        <p>Collected information is used exclusively for authorized operational and educational purposes:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-300">
          <li>Delivering classroom tools, content generation, and AI insights requested by the user.</li>
          <li>Maintaining service security, diagnosing technical issues, and preventing fraudulent usage.</li>
          <li>
            Communicating critical service announcements, security updates, or responding to support
            inquiries.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          5. Data Sharing & Disclosure
        </h2>
        <p>
          MindVault will <strong className="text-white">never sell, rent, or monetize</strong> personal
          or student data under any circumstances. We share data solely with:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-slate-300">
          <li>
            <strong className="text-white">Trusted Sub-processors:</strong> Cloud hosting and
            infrastructure providers that adhere to equivalent data protection standards.
          </li>
          <li>
            <strong className="text-white">Legal Obligations:</strong> Law enforcement or regulatory
            authorities only when required by applicable laws or valid legal processes.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">6. Security Safeguards</h2>
        <p>
          We maintain end-to-end security measures including AES-256 encryption at rest, TLS 1.3
          encryption in transit, strict role-based access restrictions, and periodic security
          evaluations to keep institutional records safe.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          7. User Rights & Data Retention
        </h2>
        <p>
          Educators, school administrators, and individuals have the right to inspect, correct,
          export, or permanently delete their account records and associated data at any time by
          reaching out to our support center.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
        <h2 className="text-2xl font-bold text-white">8. Contact Us & Data Requests</h2>
        <p>
          If you have any questions regarding this Privacy Policy, wish to execute a Data Privacy
          Agreement (DPA), or request data deletion, please contact us:
        </p>
        <div className="space-y-2 text-slate-300">
          <p>
            <strong className="text-white">Email:</strong>{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <strong className="text-white">Address:</strong> 130, 1st 7th cross Teachers layout,
            Nagarabhavi, Bangalore, 560072
          </p>
          <p>
            You can also use our{' '}
            <Link to="/contact" className="font-semibold text-cyan-400 hover:text-cyan-300">
              Contact Us
            </Link>{' '}
            page.
          </p>
        </div>
      </section>
    </PolicyLayout>
  );
}
