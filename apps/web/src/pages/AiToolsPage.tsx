import { Link } from 'react-router-dom';
import { PolicyLayout } from '@/components/PolicyLayout';
import { AI_TOOLS, AI_TOOL_COUNT, FREE_TOOL_COUNT } from '@/content/marketing';

export default function AiToolsPage() {
  return (
    <PolicyLayout title="MindVault AI tools" lastUpdated="November 2026" wide>
      <p>
        {AI_TOOL_COUNT} AI tools for teachers, students, parents and schools. {FREE_TOOL_COUNT} are free to start; the
        Curriculum &amp; Textbook Studio needs Pro, and Classroom comes with school and academy accounts.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {AI_TOOLS.map((tool) => (
          <article key={tool.id} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-xl font-bold text-white">{tool.title}</h2>
            <p>{tool.description}</p>
            <p className="text-base text-slate-400">
              {tool.focus} · Available on: <span className="font-semibold text-cyan-400">{tool.availability}</span>
            </p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <Link to="/register" className="bp-btn bp-btn--primary bp-btn--lg">
          Start Free
        </Link>
        <Link to="/pricing" className="bp-btn bp-btn--outline">
          See Pricing
        </Link>
      </div>
    </PolicyLayout>
  );
}
