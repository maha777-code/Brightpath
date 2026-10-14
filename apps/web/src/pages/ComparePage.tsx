import { Link } from 'react-router-dom';
import { PolicyLayout } from '@/components/PolicyLayout';
import { COMPARISON_ROWS } from '@/content/marketing';

export default function ComparePage() {
  return (
    <PolicyLayout title="MindVault vs generic AI chatbots" lastUpdated="October 2026">
      <p>
        General-purpose AI chat tools are useful, but they start from a blank prompt every time and
        know nothing about your class. MindVault is built around the textbook and syllabus you
        actually teach. Here is how the two approaches differ.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm md:text-base">
          <caption className="sr-only">Feature comparison of MindVault and generic AI chatbots</caption>
          <thead className="bg-slate-950/80 text-white">
            <tr>
              <th scope="col" className="px-5 py-4 font-bold">What matters in a classroom</th>
              <th scope="col" className="px-5 py-4 font-bold text-cyan-400">MindVault</th>
              <th scope="col" className="px-5 py-4 font-bold">Generic AI chatbot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.feature}>
                <th scope="row" className="px-5 py-4 font-semibold text-white">{row.feature}</th>
                <td className="px-5 py-4 text-slate-200">{row.mindvault}</td>
                <td className="px-5 py-4 text-slate-400">{row.generic}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">When a generic chatbot is enough</h2>
        <p>
          For a quick one-off idea, any chatbot works. MindVault is worth it when you want outputs that
          match your chapters, need finished classroom formats, or are rolling AI out to a whole
          school with separate access for teachers, students and parents.
        </p>
      </section>

      <div className="flex flex-wrap gap-4">
        <Link to="/register" className="bp-btn bp-btn--primary bp-btn--lg">
          Start Free
        </Link>
        <Link to="/pricing" className="bp-btn bp-btn--outline">
          See Pricing
        </Link>
        <Link to="/contact" className="bp-btn bp-btn--outline">
          Book a School Walkthrough
        </Link>
      </div>
    </PolicyLayout>
  );
}
