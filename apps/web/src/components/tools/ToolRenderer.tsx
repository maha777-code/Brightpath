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
  /** Classroom is a full app, not a generator wizard. */
  const isClassroom = tool.componentKey === 'Classroom';
  /** Dedicated pages get AIToolHeader here; wizard modals pass hideHeader and supply their own surface. */
  const wrapWithWizard = !hideHeader && !isClassroom;
  /** Skip per-tool breadcrumbs / nested AIToolHeader — chrome comes from the wizard shell or modal. */
  const childEmbedded = true;

  const renderActualTool = () => {
    switch (tool.componentKey) {
      case 'WorksheetGenerator':
        return <WorksheetGenerator embedded={childEmbedded} />;
      case 'QuizGenerator':
        return <QuizGenerator embedded={childEmbedded} />;
      case 'LessonPlanGenerator':
        return <LessonPlanGenerator embedded={childEmbedded} />;
      case 'SongGenerator':
        return <SongGeneratorDashboard embedded={childEmbedded} />;
      case 'GamifiedActivity':
        return <GamifiedActivityGenerator embedded={childEmbedded} />;
      case 'Classroom':
        return <ClassroomApp />;
      case 'PresentationGenerator':
        return <PresentationGenerator embedded={childEmbedded} />;
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
        if (tool.id === 'family-email') return <EmailResponder embedded={childEmbedded} />;
        return <CustomDynamicTool tool={tool} embedded={childEmbedded} />;
    }
  };

  return (
    <div className="mv-tool-surface mv-text-plus-2 relative flex h-full min-h-0 w-full min-w-0 flex-col">
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
      {wrapWithWizard ? (
        <AIToolHeader
          toolName={tool.title}
          description={tool.description}
          onClose={onClose}
          className="flex h-full min-h-0 w-full flex-1 flex-col px-4 pt-4 sm:px-6"
          contentClassName="min-h-0 flex-1"
        >
          {renderActualTool()}
        </AIToolHeader>
      ) : (
        <div className={embedded ? 'min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-6' : 'min-h-0 flex-1'}>
          {renderActualTool()}
        </div>
      )}
    </div>
  );
}
