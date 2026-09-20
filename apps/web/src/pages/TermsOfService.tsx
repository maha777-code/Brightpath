import { PolicyLayout } from '@/components/PolicyLayout';

export default function TermsOfService() {
  return (
    <PolicyLayout lastUpdated="September 2026" title="Terms of Service">
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">1. Account Terms</h2>
        <p>
          You are responsible for keeping your MindVault credentials secure and for activity under your
          account. We may suspend or terminate accounts that violate these terms, impersonate others, or
          attempt to access data they are not authorized to see.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">2. Acceptable Use</h2>
        <p>
          MindVault is for educational use. Do not upload unlawful content, attempt to jailbreak safety
          controls, scrape the service, or use generated materials in ways that harm students. Schools
          and teachers remain responsible for classroom decisions and academic integrity policies.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">3. Subscriptions</h2>
        <p>
          Free and paid plans (including Teacher Pro, Student Pro, Family Plan, Tutor Center Pro, and
          School Enterprise) describe usage limits such as document uploads and seat counts. Paid
          subscriptions renew until canceled. Changes take effect at the next billing cycle unless
          otherwise stated in your school agreement.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">4. Liability</h2>
        <p>
          AI-generated content can be incomplete or incorrect. MindVault is provided as-is for
          instructional support and is not a substitute for professional judgment. To the extent
          permitted by law, we are not liable for grades, placement decisions, or losses arising from
          reliance on generated output.
        </p>
      </section>
    </PolicyLayout>
  );
}
