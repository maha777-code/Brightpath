import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  GripVertical,
  ImagePlus,
  Info,
  Target,
  Loader2,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import type { QuizGeneratorQuestion, QuizGeneratorResponse } from '@brightpath/shared';

export type QuizQuestionType = 'Multiple choice' | 'Short answer';

export type EditableQuizQuestion = QuizGeneratorQuestion & {
  learningGoal: string;
  type: QuizQuestionType;
  imageUrl?: string;
  rubric?: string;
};

const LANGUAGES = ['English', 'Hindi', 'Arabic', 'Spanish', 'French', 'Tamil', 'Telugu'];

function stripStem(value: string) {
  return value.replace(/^\d+\.\s*/, '').replace(/^[A-G][.)]\s+/i, '').trim();
}

function titleFromTopic(topic: string) {
  const clean = topic.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Untitled quiz';
  const sentence = clean.charAt(0).toUpperCase() + clean.slice(1);
  return sentence.length > 80 ? `${sentence.slice(0, 77)}…` : sentence;
}

function simplify(text: string) {
  const words = text.replace(/[(),]/g, '').split(/\s+/).filter(Boolean);
  const short = words.slice(0, 12).join(' ');
  return words.length > 12 ? `${short}…` : short;
}

export function toEditableQuestions(quiz: QuizGeneratorResponse, topic: string): EditableQuizQuestion[] {
  const goal = topic.trim()
    ? `Describe and explain the major ideas in ${topic.trim()}.`
    : 'Explain the idea this question is checking.';
  return quiz.questions.map((q, i) => ({
    ...q,
    id: q.id ?? i + 1,
    question: stripStem(q.question),
    options: q.options.map((opt) => stripStem(opt)),
    learningGoal: goal,
    type: 'Multiple choice',
    rubric: '',
  }));
}

export function toQuizResponse(questions: EditableQuizQuestion[]): QuizGeneratorResponse {
  return {
    questions: questions.map((q, i) => ({
      id: i + 1,
      question: q.question,
      options: q.options,
      correctOption: q.correctOption,
    })),
    answerKey: questions.map((q) => q.correctOption || 'A'),
  };
}

export function QuizEditor({
  topic,
  gradeLevel,
  initial,
  onBack,
  onSave,
  onRegenerateQuestion,
}: {
  topic: string;
  gradeLevel: string;
  initial: EditableQuizQuestion[];
  onBack: () => void;
  onSave: (quiz: { title: string; description: string; questions: EditableQuizQuestion[] }) => void;
  onRegenerateQuestion: (index: number) => Promise<QuizGeneratorQuestion | null>;
}) {
  const [title, setTitle] = useState(titleFromTopic(topic));
  const [description, setDescription] = useState(
    `Identify the key ideas, explain the major events, and apply this knowledge. Written for ${gradeLevel || 'this class'}.`,
  );
  const [questions, setQuestions] = useState(initial);
  const [translation, setTranslation] = useState(false);
  const [language, setLanguage] = useState('Hindi');
  const [simplifyOn, setSimplifyOn] = useState(false);
  const [feedback, setFeedback] = useState<'question' | 'end'>('question');
  const [saved, setSaved] = useState(false);
  const [reaction, setReaction] = useState<'up' | 'down' | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const patch = (index: number, next: Partial<EditableQuizQuestion>) => {
    setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, ...next } : row)));
    setSaved(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((rows) => {
      const copy = [...rows];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
    setSaved(false);
  };

  const remove = (index: number) => {
    setQuestions((rows) => rows.filter((_, i) => i !== index));
    setSaved(false);
  };

  const onImage = (index: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch(index, { imageUrl: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  return (
    <div className="quiz-editor flex h-full min-h-0 flex-col bg-[#070b14] text-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <p className="truncate text-xs text-slate-400">
          AI Tools <span className="px-1 text-slate-600">›</span> Quizzes{' '}
          <span className="px-1 text-slate-600">›</span> Create a quiz{' '}
          <span className="px-1 text-slate-600">›</span>{' '}
          <span className="font-semibold text-slate-200">Edit quiz</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onBack} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({ title, description, questions });
              setSaved(true);
            }}
            className="rounded-lg bg-violet-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-violet-400"
          >
            {saved ? 'Saved' : 'Save quiz'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
            className="w-full bg-transparent text-2xl font-black tracking-tight text-white outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
            rows={2}
            className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-slate-400 outline-none"
          />

          <div className="mt-6 space-y-4">
            {questions.map((q, index) => {
              const correct = q.correctOption.charCodeAt(0) - 65;
              return (
                <article key={`${q.id}-${index}`} className="rounded-2xl border border-slate-800 bg-[#10151f] p-4">
                  <div className="flex gap-3">
                    <span className="mt-1 text-sm font-bold text-slate-400">{index + 1}</span>
                    <textarea
                      value={q.question}
                      onChange={(e) => patch(index, { question: e.target.value })}
                      rows={2}
                      className="w-full resize-none bg-transparent text-sm font-semibold leading-relaxed text-white outline-none"
                    />
                  </div>

                  {simplifyOn ? (
                    <p className="ml-7 mt-1 text-xs text-cyan-300">Simpler wording: {simplify(q.question)}</p>
                  ) : null}
                  {translation ? (
                    <p className="ml-7 mt-1 text-xs text-violet-300">Students can translate this question into {language}.</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => fileRefs.current[index]?.click()}
                    className="ml-7 mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    <ImagePlus className="h-3.5 w-3.5" /> {q.imageUrl ? 'Change image' : 'Add image'}
                  </button>
                  <input
                    ref={(node) => { fileRefs.current[index] = node; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onImage(index, e.target.files?.[0])}
                  />
                  {q.imageUrl ? <img src={q.imageUrl} alt="" className="ml-7 mt-3 max-h-40 rounded-lg object-contain" /> : null}

                  {q.type === 'Multiple choice' ? (
                    <ul className="ml-7 mt-3 space-y-2">
                      {q.options.map((opt, j) => {
                        const letter = String.fromCharCode(65 + j);
                        const selected = j === correct;
                        return (
                          <li key={`${letter}-${j}`}>
                            <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${selected ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-100' : 'border-slate-800 bg-[#0b1018] text-slate-200'}`}>
                              <button
                                type="button"
                                aria-label={`Mark ${letter} correct`}
                                onClick={() => patch(index, { correctOption: letter })}
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-500'}`}
                              >
                                {selected ? <Check className="h-3 w-3" /> : null}
                              </button>
                              <span className="font-bold">{letter}</span>
                              <input
                                value={opt}
                                onChange={(e) => {
                                  const options = [...q.options];
                                  options[j] = e.target.value;
                                  patch(index, { options });
                                }}
                                className="w-full bg-transparent outline-none"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="ml-7 mt-3 rounded-xl border border-slate-800 bg-[#0b1018] p-3">
                      <p className="inline-flex items-center gap-1 text-xs font-bold text-slate-300">
                        Answer and grading rubric
                        <Info className="h-3.5 w-3.5 text-slate-500" />
                      </p>
                      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Exemplar response</p>
                      <textarea
                        value={q.rubric}
                        onChange={(e) => patch(index, { rubric: e.target.value })}
                        placeholder="Write the answer that earns full credit."
                        rows={3}
                        className="mt-1 w-full resize-none bg-transparent text-sm text-slate-200 outline-none"
                      />
                      <p className="mt-2 text-xs font-bold text-slate-400">Full credit (1 point)</p>
                    </div>
                  )}

                  <button type="button" onClick={() => move(index, index === questions.length - 1 ? -1 : 1)} className="ml-7 mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white">
                    <GripVertical className="h-3.5 w-3.5" /> Reorder
                  </button>

                  <div className="ml-7 mt-4">
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <Target className="h-3.5 w-3.5" /> Learning goal
                    </p>
                    <input
                      value={q.learningGoal}
                      onChange={(e) => patch(index, { learningGoal: e.target.value })}
                      className="mt-1 w-full bg-transparent text-sm text-slate-300 outline-none"
                    />
                  </div>

                  {feedback === 'question' ? (
                    <p className="ml-7 mt-2 text-xs text-slate-500">Students get AI feedback and a score after this question.</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-400">
                      Type
                      <span className="relative">
                        <select
                          value={q.type}
                          onChange={(e) => patch(index, { type: e.target.value as QuizQuestionType })}
                          className="appearance-none rounded-lg border border-slate-700 bg-[#0b1018] py-1 pl-2 pr-7 text-xs font-semibold text-slate-200"
                        >
                          <option>Multiple choice</option>
                          <option>Short answer</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1.5 h-3.5 w-3.5 text-slate-500" />
                      </span>
                    </label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        type="button"
                        aria-label="Regenerate question"
                        disabled={regenerating !== null}
                        onClick={() => {
                          setRegenerating(index);
                          void onRegenerateQuestion(index)
                            .then((next) => {
                              if (!next) return;
                              patch(index, {
                                question: stripStem(next.question),
                                options: next.options.map((opt) => stripStem(opt)),
                                correctOption: next.correctOption || 'A',
                              });
                            })
                            .finally(() => setRegenerating(null));
                        }}
                        className="rounded-lg p-2 hover:bg-slate-800 disabled:opacity-40"
                      >
                        {regenerating === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </button>
                      <button type="button" aria-label="Move question up" onClick={() => move(index, -1)} className="rounded-lg p-2 hover:bg-slate-800"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label="Move question down" onClick={() => move(index, 1)} className="rounded-lg p-2 hover:bg-slate-800"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" aria-label="Delete question" onClick={() => remove(index)} className="rounded-lg p-2 hover:bg-slate-800 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              );
            })}
            {feedback === 'end' ? (
              <p className="rounded-xl border border-slate-800 bg-[#10151f] px-4 py-3 text-sm text-slate-300">
                Students receive AI feedback and a score after the whole quiz.
              </p>
            ) : null}
          </div>
        </div>

        <aside className="w-full shrink-0 border-t border-slate-800 p-4 lg:w-72 lg:border-l lg:border-t-0">
          <section className="rounded-2xl border border-slate-800 bg-[#10151f] p-4">
            <h2 className="text-sm font-bold">Student supports</h2>
            <p className="mt-1 text-xs text-slate-500">Shown while students answer.</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span>Translation</span>
              <button type="button" aria-label="Translation" aria-pressed={translation} onClick={() => setTranslation((v) => !v)} className={`h-6 w-11 rounded-full p-0.5 ${translation ? 'bg-violet-500' : 'bg-slate-700'}`}>
                <span className={`block h-5 w-5 rounded-full bg-white transition ${translation ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Students can translate each question and its answer choices into another language while they take the quiz. Their answers are still graded against the original wording.
            </p>
            {translation ? (
              <>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0b1018] px-2 py-1.5 text-xs">
                  {LANGUAGES.map((item) => <option key={item}>{item}</option>)}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Students see this quiz in {language}. Turn this off to keep the original language only.
                </p>
              </>
            ) : null}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>Simplify</span>
              <button type="button" aria-label="Simplify" aria-pressed={simplifyOn} onClick={() => setSimplifyOn((v) => !v)} className={`h-6 w-11 rounded-full p-0.5 ${simplifyOn ? 'bg-violet-500' : 'bg-slate-700'}`}>
                <span className={`block h-5 w-5 rounded-full bg-white transition ${simplifyOn ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-800 bg-[#10151f] p-4">
            <h2 className="text-sm font-bold">AI feedback</h2>
            <div className="mt-3 grid grid-cols-2 rounded-lg bg-[#0b1018] p-1 text-xs font-bold">
              <button type="button" onClick={() => setFeedback('question')} className={`rounded-md px-2 py-1.5 ${feedback === 'question' ? 'bg-violet-500 text-white' : 'text-slate-400'}`}>Per question</button>
              <button type="button" onClick={() => setFeedback('end')} className={`rounded-md px-2 py-1.5 ${feedback === 'end' ? 'bg-violet-500 text-white' : 'text-slate-400'}`}>At end</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Students receive AI feedback and scores {feedback === 'question' ? 'after each question' : 'after the quiz'}.</p>
          </section>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Please share your feedback</span>
            <span className="flex gap-1">
              <button type="button" aria-label="Helpful" onClick={() => setReaction('up')} className={`rounded p-1 ${reaction === 'up' ? 'text-emerald-300' : ''}`}><ThumbsUp className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Not helpful" onClick={() => setReaction('down')} className={`rounded p-1 ${reaction === 'down' ? 'text-rose-300' : ''}`}><ThumbsDown className="h-3.5 w-3.5" /></button>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
