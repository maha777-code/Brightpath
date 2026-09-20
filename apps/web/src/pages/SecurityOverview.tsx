import { Link } from 'react-router-dom';
import { PolicyLayout } from '@/components/PolicyLayout';

const CONTACT_EMAIL = 'qxicybertech.helpcenter@gmail.com';

export default function SecurityOverview() {
  return (
    <PolicyLayout lastUpdated="October 2026" title="Security Overview">
      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          1. Security Commitments & Architecture
        </h2>
        <p>
          At MindVault, security is engineered into every layer of our infrastructure. We implement
          industry-leading standards to safeguard educational data, user credentials, and platform
          performance against threats.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          2. Data Encryption Standards
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-white">Encryption in Transit:</strong> All communication between
            client applications and MindVault services is encrypted using TLS 1.3.
          </li>
          <li>
            <strong className="text-white">Encryption at Rest:</strong> Stored data, database records,
            and backups are encrypted using AES-256 key management standards. Session tokens and
            passwords use industry-standard hashing.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          3. Zero Data Retention & AI Model Integrity
        </h2>
        <p>We keep prompt data isolated from third-party large language models:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Model training on customer or student data is strictly blocked.</li>
          <li>
            AI service requests use Zero Data Retention (ZDR) endpoints that delete input and output
            buffers immediately after response generation.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          4. Access Control & Multi-Tenant Isolation
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-white">Role-Based Access Control (RBAC):</strong> Schools,
            tutoring centers, teachers, parents, and students only see resources authorized for their
            role. Parent and class invite codes are required to link accounts.
          </li>
          <li>
            <strong className="text-white">Tenant Isolation:</strong> Data across schools and
            enterprise accounts is logically segmented to prevent unauthorized cross-tenant exposure.
            Lesson file uploads stay inside your tenant boundary.
          </li>
          <li>
            <strong className="text-white">Continuous Diagnostic Monitoring:</strong> Automated threat
            monitoring and regular vulnerability assessments safeguard cloud endpoints.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          5. Compliance Readiness
        </h2>
        <p>
          MindVault is designed around education privacy expectations, including FERPA-aligned
          handling of student records and a SOC 2 control program for access, logging, and vendor
          review. We regularly assess subprocessors that support AI inference and hosting. See our{' '}
          <Link to="/privacy" className="font-semibold text-cyan-400 hover:text-cyan-300">
            Privacy Policy
          </Link>{' '}
          for data-handling details.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
        <h2 className="text-2xl font-bold text-white">6. Security Inquiries & Vulnerability Disclosure</h2>
        <p>
          If you believe you have discovered a security vulnerability or need to submit a security
          inquiry or questionnaire, please reach out directly to our security team. Do not post
          exploit details publicly before we have had a chance to investigate.
        </p>
        <div className="space-y-2 text-slate-300">
          <p>
            <strong className="text-white">Security Email:</strong>{' '}
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
