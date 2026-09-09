import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { getTeacherToolById, type TeacherToolDefinition } from '@brightpath/shared';
import QuizGenerator from '@/pages/TeacherTools/QuizGenerator';
import WorksheetGenerator from '@/pages/TeacherTools/WorksheetGenerator';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';

function sampleOutput(tool: TeacherToolDefinition, topic: string, grade: string): string {
  const subject = topic.trim() || 'your topic';
  switch (tool.id) {
    case 'song-generator':
      return `Verse 1\nLet's explore ${subject} today,\n${grade} scientists leading the way.\nChorus\nAsk, observe, and try again —\n${subject} clicks when we explain.`;
    case 'podcast-generator':
      return `Host: Welcome to Brightpath Classroom. Today we unpack ${subject} for ${grade}.\nGuest: Start with a real-world hook, then one clear model, then a check-for-understanding question.`;
    case 'worksheet-generator':
      return `Worksheet: ${subject} (${grade})\n1. Define ${subject} in your own words.\n2. Give one classroom example.\n3. Explain a common misconception.\n4. Apply it to a short problem.`;
    case 'text-rewriter':
      return `Rewritten for ${grade}:\n${subject} is introduced in plain language, then expanded with one worked example and a stretch question.`;
    case 'lesson-plan':
      return `Lesson plan — ${subject} (${grade})\nObjective: Students can explain ${subject} with an example.\nWarm-up (5m) → Mini-lesson (12m) → Practice (15m) → Exit ticket (8m).`;
    case 'quiz-generator':
      return `Quiz: ${subject}\n1. Which statement best describes ${subject}?\n2. A student mixes up two related ideas. What should they check first?\n3. Apply ${subject} to a ${grade} scenario.`;
    case 'presentation-generator':
      return `Slide 1: ${subject}\nSlide 2: Why it matters for ${grade}\nSlide 3: Core idea\nSlide 4: Worked example\nSlide 5: Check for understanding`;
    case 'writing-feedback':
      return `Feedback on writing about ${subject}:\nStrength: Clear topic sentence.\nNext step: Add one piece of evidence and explain how it supports the claim.`;
    case 'youtube-questions':
      return `Guiding questions for a video on ${subject}:\n1. What problem is the video trying to solve?\n2. Pause at the model — what changed?\n3. How would you teach this to a classmate?`;
    case 'family-email':
      return `Subject: Update on ${subject}\nHello families,\nThis week we are studying ${subject} in ${grade}. Students will practice with a short activity and a check-in. Thank you for supporting learning at home.`;
    default:
      return `Ready to generate ${tool.title.toLowerCase()} for ${subject}.`;
  }
}

export function TeacherToolLauncher({
  tool,
  embedded,
  favorited,
  onToggleFavorite,
}: {
  tool: TeacherToolDefinition;
  embedded?: boolean;
  favorited?: boolean;
  onToggleFavorite?: () => void;
}) {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('Class 9');
  const [output, setOutput] = useState<string | null>(null);

  if (tool.id === 'quiz-generator') {
    const quiz = <QuizGenerator favorited={favorited} onToggleFavorite={onToggleFavorite} />;
    if (embedded) return quiz;
    return (
      <TeacherWorkspaceLayout>
        <main className="w-full max-w-7xl px-6 py-6 lg:px-10 lg:py-8">
          <Link
            to="/teacher/tools"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to AI Tools Suite
          </Link>
          <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-8">{quiz}</div>
        </main>
      </TeacherWorkspaceLayout>
    );
  }

  if (tool.id === 'worksheet-generator') {
    const worksheet = (
      <WorksheetGenerator favorited={favorited} onToggleFavorite={onToggleFavorite} />
    );
    if (embedded) return worksheet;
    return (
      <TeacherWorkspaceLayout>
        <main className="w-full max-w-7xl px-6 py-6 lg:px-10 lg:py-8">
          <div className="rounded-2xl bg-slate-50 p-4 shadow-xl sm:p-6">{worksheet}</div>
        </main>
      </TeacherWorkspaceLayout>
    );
  }

  const body = (
    <div className="space-y-5">
      {!embedded && (
        <Link
          to="/teacher/tools"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to AI Tools Suite
        </Link>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-200/70">
          {tool.focusArea}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">{tool.title}</h1>
        <p className="mt-2 text-base text-cyan-200/80">{tool.description}</p>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-cyan-100">Topic or text</span>
        <textarea
          className="td-input min-h-28 w-full rounded-2xl px-4 py-3 text-base"
          placeholder="Enter a topic, standard, or source text…"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </label>
      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-semibold text-cyan-100">Grade</span>
        <select
          className="td-input w-full rounded-2xl px-4 py-3 text-base"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        >
          {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="td-btn-cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold"
        onClick={() => setOutput(sampleOutput(tool, topic, grade))}
      >
        <Sparkles className="h-4 w-4" /> Generate
      </button>
      {output && (
        <pre className="td-card whitespace-pre-wrap rounded-2xl p-5 text-sm leading-relaxed text-cyan-50">
          {output}
        </pre>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <TeacherWorkspaceLayout>
      <main className="w-full max-w-3xl space-y-6 px-6 py-6 lg:px-10 lg:py-8">{body}</main>
    </TeacherWorkspaceLayout>
  );
}

export default function TeacherToolPage() {
  const { toolId = '' } = useParams<{ toolId: string }>();
  const tool = useMemo(() => getTeacherToolById(toolId), [toolId]);

  if (toolId === 'curriculum-studio') {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  if (!tool) {
    return (
      <TeacherWorkspaceLayout>
        <main className="px-8 py-10">
          <p className="td-card rounded-2xl p-6 text-cyan-100">That tool was not found.</p>
          <Link to="/teacher/tools" className="mt-4 inline-block text-cyan-200 underline">
            Return to the tools hub
          </Link>
        </main>
      </TeacherWorkspaceLayout>
    );
  }

  return <TeacherToolLauncher tool={tool} />;
}
