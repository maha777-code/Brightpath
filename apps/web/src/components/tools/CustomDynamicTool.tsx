import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { sampleOutput } from '@/lib/toolPreview';
import type { ToolDefinition } from '@/config/toolsRegistry';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import {
  TOOL_BREADCRUMB,
  TOOL_BREADCRUMB_LINK,
  TOOL_CARD,
  TOOL_FIELD,
  TOOL_GENERATE,
  TOOL_LABEL,
  TOOL_MUTED,
  TOOL_PAGE,
  TOOL_SUBTITLE,
  TOOL_TEXTAREA,
  TOOL_TITLE,
} from '@/components/tools/toolTheme';

/** Same topic form the teacher hub uses for tools that do not have a dedicated generator yet. */
export function CustomDynamicTool({ tool }: { tool: Pick<ToolDefinition, 'id' | 'title' | 'description' | 'category'> }) {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('Class 9');
  const [files, setFiles] = useState<string[]>([]);
  const [output, setOutput] = useState<string | null>(null);
  const topicId = `${tool.id}-topic`;
  const gradeId = `${tool.id}-grade`;

  return (
    <div className={TOOL_PAGE}>
      <nav className={TOOL_BREADCRUMB}>
        <Link to="/teacher/tools" className={TOOL_BREADCRUMB_LINK}>Teacher Tools</Link>
        <span className={TOOL_MUTED}>›</span>
        <span>{tool.title}</span>
      </nav>
      <form
        className={TOOL_CARD}
        onSubmit={(event) => {
          event.preventDefault();
          setOutput(sampleOutput({ id: tool.id, title: tool.title }, topic, grade));
        }}
      >
        <h1 className={TOOL_TITLE}>{tool.title}</h1>
        <p className={TOOL_SUBTITLE}>{tool.description}</p>

        <label className={`${TOOL_LABEL} mt-6`} htmlFor={gradeId}>Grade level: *</label>
        <select id={gradeId} className={TOOL_FIELD} value={grade} onChange={(event) => setGrade(event.target.value)}>
          {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className={TOOL_LABEL} htmlFor={topicId}>Topic or text: *</label>
        <textarea
          id={topicId}
          className={TOOL_TEXTAREA}
          placeholder="Enter a topic, standard, or source text…"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <AddFileMenu
            onFiles={(list) => {
              const names = Array.from(list ?? []).map((file) => file.name);
              if (names.length) setFiles((current) => [...current, ...names]);
            }}
          />
          {files.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {files.map((name) => (
                <li key={name} className="mv-pres-field inline-flex items-center rounded-full px-3 py-1 text-xs">
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button type="submit" className={TOOL_GENERATE}>
          <Sparkles className="h-4 w-4" /> Generate
        </button>

        {output ? (
          <pre className="mv-pres-field mt-6 whitespace-pre-wrap rounded-xl p-5 text-sm leading-relaxed">{output}</pre>
        ) : null}
      </form>
    </div>
  );
}
