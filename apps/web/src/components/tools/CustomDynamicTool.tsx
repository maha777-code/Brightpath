import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { sampleOutput } from '@/lib/toolPreview';
import type { ToolDefinition } from '@/config/toolsRegistry';

/** Same topic form the teacher hub uses for tools that do not have a dedicated generator yet. */
export function CustomDynamicTool({ tool }: { tool: Pick<ToolDefinition, 'id' | 'title' | 'description' | 'category'> }) {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('Class 9');
  const [output, setOutput] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-200/70">{tool.category}</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">{tool.title}</h1>
        <p className="mt-2 text-base text-cyan-200/80">{tool.description}</p>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-cyan-100">Topic or text</span>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          placeholder="Enter a topic, standard, or source text…"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        />
      </label>
      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-semibold text-cyan-100">Grade</span>
        <select
          className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          style={{ backgroundColor: '#020617', color: '#fff' }}
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
        >
          {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="inline-flex cursor-pointer appearance-none items-center gap-2 rounded-full border border-cyan-400 bg-cyan-500 px-6 py-3 text-base font-semibold text-slate-950"
        onClick={() => setOutput(sampleOutput({ id: tool.id, title: tool.title }, topic, grade))}
      >
        <Sparkles className="h-4 w-4" /> Generate
      </button>
      {output ? (
        <pre className="whitespace-pre-wrap rounded-2xl border border-slate-700 bg-slate-950 p-5 text-sm leading-relaxed text-cyan-50">
          {output}
        </pre>
      ) : null}
    </div>
  );
}
