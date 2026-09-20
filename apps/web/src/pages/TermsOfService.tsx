import { Link } from 'react-router-dom';
import { PolicyLayout } from '@/components/PolicyLayout';

const CONTACT_EMAIL = 'qxicybertech.helpcenter@gmail.com';

export default function TermsOfService() {
  return (
    <PolicyLayout lastUpdated="October 2026" title="Terms of Service">
      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          1. Agreement & Acceptance of Terms
        </h2>
        <p>
          By accessing, registering for, or using the MindVault platform ("Service"), provided by
          MindVault, Inc. ("Company," "we," "us," or "our"), you agree to be bound by these Terms of
          Service. If you are accepting these terms on behalf of a school, district, or educational
          organization, you represent and warrant that you have full legal authority to bind that
          entity.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          2. Eligibility & Educational Accounts
        </h2>
        <p>
          MindVault is designed for use by schools, districts, tutoring centers, independent educators,
          parents, and students.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-white">Student Accounts:</strong> Accounts created for students
            under the age of 18 must be set up, managed, or authorized by an institution, parent, or
            legal guardian in compliance with applicable student privacy laws (including COPPA and
            FERPA).
          </li>
          <li>
            <strong className="text-white">Account Security:</strong> You are responsible for
            maintaining the confidentiality of your login credentials and for all activities that
            occur under your account.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          3. Account Registration & Responsibilities
        </h2>
        <p>
          You must provide accurate registration information, choose the role that matches your use
          (school, academy, teacher, parent, or student), and keep that information current. You may
          not impersonate others, share accounts except as allowed by an institutional license, or
          attempt to access workspaces you are not authorized to see.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          4. Acceptable Use & AI Output Responsibility
        </h2>
        <p>
          MindVault provides AI-assisted teaching and learning tools. When using our generative AI
          features, you agree to the following:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-white">Professional Review:</strong> Generative AI outputs may
            contain errors or inaccuracies. Educators and users are solely responsible for reviewing
            and verifying AI-generated materials before classroom distribution or instructional use.
          </li>
          <li>
            <strong className="text-white">Prohibited Uses:</strong> Do not upload malicious code,
            attempt to compromise platform security, reverse engineer our models, generate
            harmful or hateful content, jailbreak safety controls, scrape the Service, or use
            MindVault to breach student privacy laws.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          5. Intellectual Property & Ownership
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-white">User Input & Output Ownership:</strong> As between you and
            MindVault, you retain ownership of original content you input into the Service as well as
            the unique outputs generated for your account.
          </li>
          <li>
            <strong className="text-white">MindVault IP:</strong> The Service, including software,
            design, branding, logos, and underlying proprietary algorithms, remains the exclusive
            property of MindVault, Inc.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          6. Student Data Privacy & Institutional Rights
        </h2>
        <p>
          Student education records are handled as described in our{' '}
          <Link to="/privacy" className="font-semibold text-cyan-400 hover:text-cyan-300">
            Privacy Policy
          </Link>
          . We do not sell student data or use K–12 content to train public foundation models.
          Schools and districts remain the controllers of institutional student records. Parents,
          teachers, and administrators only see data their role is authorized to access.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          7. Subscriptions, Fees & Billing
        </h2>
        <p>
          Certain features require paid plans (Teacher Pro, Student Pro, Family Plan, Tutor Center
          Pro, and School Enterprise). Fees are billed in advance on a recurring monthly or annual
          basis depending on your selected tier. You may cancel prior to the next renewal cycle.
          Changes take effect at the next billing cycle unless otherwise stated in a school
          agreement. Free plans remain subject to documented usage limits.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          8. Disclaimer of Warranties & Limitation of Liability
        </h2>
        <p>
          THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE MAXIMUM EXTENT
          PERMITTED BY LAW, MINDVAULT DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED. AI-GENERATED
          CONTENT IS INSTRUCTIONAL SUPPORT AND IS NOT A SUBSTITUTE FOR PROFESSIONAL JUDGMENT. IN NO
          EVENT SHALL MINDVAULT BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, OR FOR
          GRADES, PLACEMENT DECISIONS, OR LOSSES ARISING FROM RELIANCE ON GENERATED OUTPUT.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          9. Termination & Governing Law
        </h2>
        <p>
          We may suspend or terminate access if a user violates these Terms. Upon account deletion
          or contract termination, associated user data is removed in accordance with our retention
          policy. These Terms are governed by the laws of India, without regard to conflict-of-law
          rules, and disputes shall be resolved in the courts of Bengaluru, Karnataka, unless a
          school agreement specifies otherwise.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
        <h2 className="text-2xl font-bold text-white">10. Questions & Legal Inquiries</h2>
        <p>
          If you have questions, concerns, or legal inquiries regarding these Terms of Service,
          please contact us:
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
