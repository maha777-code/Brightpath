import { PolicyLayout } from '@/components/PolicyLayout';

export default function PrivacyPolicy() {
  return (
    <PolicyLayout lastUpdated="September 2026" title="Privacy Policy">
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">1. Information We Collect</h2>
        <p>
          MindVault collects essential account data such as name, institutional email, role, school or
          organization name, and usage metrics needed to deliver personalized AI learning environments.
          Students may also provide date of birth so we can tailor curriculum and tutor voice by age group.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">2. How We Use AI</h2>
        <p>
          Prompts, lesson materials, and tutor conversations are processed to generate instructional
          support—quizzes, lesson plans, writing feedback, and guided tutoring. AI outputs stay tied to
          your workspace. We do not use K–12 student content to train public foundation models.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">3. Student Data Protection</h2>
        <p>
          We do not sell student data. Educational records and AI interactions are encrypted and used
          solely for classroom enrichment, progress tracking, and account security. Parents, teachers,
          and administrators only see the records their role is authorized to access.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">4. Contact</h2>
        <p>
          Privacy questions and data requests can be sent to{' '}
          <a href="mailto:hello@brightpath.ai" className="font-semibold text-cyan-400 hover:text-cyan-300">
            hello@brightpath.ai
          </a>
          .
        </p>
      </section>
    </PolicyLayout>
  );
}
