import { PolicyLayout } from '@/components/PolicyLayout';

export default function SecurityOverview() {
  return (
    <PolicyLayout lastUpdated="September 2026" title="Security Overview">
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">Encryption</h2>
        <p>
          Data is protected with TLS 1.3 in transit and AES-256 encryption at rest. Session tokens and
          passwords are stored using industry-standard hashing. File uploads for lesson materials stay
          inside your tenant boundary.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">Role-Based Access Control</h2>
        <p>
          Multi-tenant permissions separate schools, tutoring centers, teachers, parents, and students.
          Administrators manage seats and classes; learners only see their own workspace. Parent and
          class invite codes are required to link accounts.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">Compliance</h2>
        <p>
          MindVault is designed around education privacy expectations, including FERPA-aligned handling
          of student records and a SOC 2 control program for access, logging, and vendor review. We
          regularly assess subprocessors that support AI inference and hosting.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">Data Privacy Practices</h2>
        <p>
          Production access is limited to authorized staff with least-privilege roles. Security or
          incident reports can be sent to{' '}
          <a href="mailto:hello@brightpath.ai" className="font-semibold text-cyan-400 hover:text-cyan-300">
            hello@brightpath.ai
          </a>
          .
        </p>
      </section>
    </PolicyLayout>
  );
}
