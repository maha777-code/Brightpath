import { Link } from 'react-router-dom';
import { AIToolHeader } from '@/components/tools/AIToolHeader';
import { WorksheetGenerator } from '@/pages/TeacherTools/WorksheetGenerator';
import { QuizGenerator } from '@/pages/TeacherTools/QuizGenerator';
import LessonPlanGenerator from '@/pages/TeacherTools/LessonPlanGenerator';
import SongGeneratorDashboard from '@/pages/TeacherTools/SongGeneratorDashboard';
import { CustomDynamicTool } from '@/components/tools/CustomDynamicTool';
import { EmailResponder } from '@/components/tools/EmailResponder';
import type { ToolDefinition } from '@/config/toolsRegistry';

interface ToolRendererProps {
  tool: ToolDefinition;
  mode?: 'production' | 'admin-preview';
  embed?: boolean;
  onClose?: () => void;
}

export function ToolRenderer({ tool, mode = 'production', embed = false, onClose }: ToolRendererProps) {
  const embedded = mode === 'admin-preview' || embed;
  const toolSuppliesHeader =
    !embedded && (tool.componentKey === 'LessonPlanGenerator' || tool.componentKey === 'SongGenerator');

  const renderActualTool = () => {
    switch (tool.componentKey) {
      case 'WorksheetGenerator':
        return <WorksheetGenerator />;
      case 'QuizGenerator':
        return <QuizGenerator />;
      case 'LessonPlanGenerator':
        return <LessonPlanGenerator embedded={embedded} />;
      case 'SongGenerator':
        return <SongGeneratorDashboard embedded={embedded} />;
      case 'CurriculumStudio':
        return (
          <div className="space-y-3 text-slate-200">
            <h2 className="text-2xl font-bold text-white">{tool.title}</h2>
            <p>{tool.description}</p>
            <Link to="/tools/curriculum-textbook-studio" className="inline-block font-bold text-cyan-300 underline">
              Open Curriculum & Textbook Studio
            </Link>
          </div>
        );
      default:
        if (tool.id === 'family-email') return <EmailResponder />;
        return <CustomDynamicTool tool={tool} />;
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-[#060911] text-slate-100">
      {mode === 'admin-preview' ? (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-[#080d1a] px-6 py-2.5 text-xs font-bold text-cyan-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            ADMIN PREVIEW MODE — Testing Live Production Tool Architecture
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer appearance-none rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              Exit Preview
            </button>
          ) : null}
        </div>
      ) : null}
      {toolSuppliesHeader ? null : (
        <div className="shrink-0 px-4 pt-4 sm:px-6">
          <AIToolHeader toolName={tool.title} onClose={onClose} />
        </div>
      )}
      <div
        className={
          embedded && (tool.componentKey === 'QuizGenerator' || tool.componentKey === 'WorksheetGenerator')
            ? 'min-h-0 flex-1 overflow-hidden'
            : embedded
              ? 'min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6'
              : 'min-h-0 flex-1 overflow-hidden'
        }
      >
        {renderActualTool()}
      </div>
    </div>
  );
}
