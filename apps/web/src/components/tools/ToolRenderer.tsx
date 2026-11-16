import { Link } from 'react-router-dom';
import { AIToolHeader } from '@/components/tools/AIToolHeader';
import { WorksheetGenerator } from '@/pages/TeacherTools/WorksheetGenerator';
import { QuizGenerator } from '@/pages/TeacherTools/QuizGenerator';
import LessonPlanGenerator from '@/pages/TeacherTools/LessonPlanGenerator';
import SongGeneratorDashboard from '@/pages/TeacherTools/SongGeneratorDashboard';
import { GamifiedActivityGenerator } from '@/pages/TeacherTools/GamifiedActivityGenerator';
import { ClassroomApp } from '@/pages/TeacherTools/Classroom';
import { PresentationGenerator } from '@/pages/TeacherTools/PresentationGenerator';
import { CustomDynamicTool } from '@/components/tools/CustomDynamicTool';
import { EmailResponder } from '@/components/tools/EmailResponder';
import type { ToolDefinition } from '@/config/toolsRegistry';
import { TOOL_CARD, TOOL_PAGE, TOOL_SUBTITLE, TOOL_TITLE } from '@/components/tools/toolTheme';

interface ToolRendererProps {
  tool: ToolDefinition;
  mode?: 'production' | 'admin-preview';
  embed?: boolean;
  hideHeader?: boolean;
  onClose?: () => void;
}

export function ToolRenderer({ tool, mode = 'production', embed = false, hideHeader = false, onClose }: ToolRendererProps) {
  const embedded = mode === 'admin-preview' || embed;
  const toolSuppliesHeader = !embedded && tool.componentKey !== 'CurriculumStudio';

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
      case 'GamifiedActivity':
        return <GamifiedActivityGenerator />;
      case 'Classroom':
        return <ClassroomApp />;
      case 'PresentationGenerator':
        return <PresentationGenerator />;
      case 'CurriculumStudio':
        return (
          <div className={TOOL_PAGE}>
            <div className={TOOL_CARD}>
              <h2 className={TOOL_TITLE}>{tool.title}</h2>
              <p className={TOOL_SUBTITLE}>{tool.description}</p>
              <Link
                to="/tools/curriculum-textbook-studio"
                className="mv-pres-generate mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold no-underline"
              >
                Open Curriculum & Textbook Studio
              </Link>
            </div>
          </div>
        );
      default:
        if (tool.id === 'family-email') return <EmailResponder embedded={embedded} />;
        return <CustomDynamicTool tool={tool} />;
    }
  };

  return (
    <div className="mv-tool-surface mv-text-plus-2 relative w-full min-w-0">
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
      {hideHeader || toolSuppliesHeader ? (
        <div className={embedded ? 'min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-6' : 'min-h-0 flex-1'}>
          {renderActualTool()}
        </div>
      ) : (
        <AIToolHeader
          toolName={tool.title}
          description={tool.description}
          onClose={onClose}
          defaultExpanded={tool.id === 'quiz-generator'}
          className={
            tool.id === 'quiz-generator'
              ? 'flex h-full min-h-0 w-full flex-col'
              : 'flex min-h-0 flex-1 flex-col px-4 pt-4 sm:px-6'
          }
          contentClassName="min-h-0 flex-1"
        >
          {renderActualTool()}
        </AIToolHeader>
      )}
    </div>
  );
}
