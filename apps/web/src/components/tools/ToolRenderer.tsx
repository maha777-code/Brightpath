import { Link } from 'react-router-dom';
import { WorksheetGenerator } from '@/pages/TeacherTools/WorksheetGenerator';
import { QuizGenerator } from '@/pages/TeacherTools/QuizGenerator';
import LessonPlanGenerator from '@/pages/TeacherTools/LessonPlanGenerator';
import SongGeneratorDashboard from '@/pages/TeacherTools/SongGeneratorDashboard';
import { CustomDynamicTool } from '@/components/tools/CustomDynamicTool';
import type { ToolDefinition } from '@/config/toolsRegistry';

interface ToolRendererProps {
  tool: ToolDefinition;
  mode?: 'production' | 'admin-preview';
  embed?: boolean;
  onClose?: () => void;
}

export function ToolRenderer({ tool, mode = 'production', embed = false, onClose }: ToolRendererProps) {
  const embedded = mode === 'admin-preview' || embed;

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
            <Link to="/teacher/dashboard" className="inline-block font-bold text-cyan-300 underline">
              Open Curriculum & Textbook Studio
            </Link>
          </div>
        );
      default:
        return <CustomDynamicTool tool={tool} />;
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-[#060911] text-slate-100">
      {mode === 'admin-preview' ? (
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b0f19] px-6 py-3 text-xs font-semibold text-cyan-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            ADMIN PREVIEW MODE — Testing Live Production Tool Architecture
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700"
            >
              Exit Preview
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={embedded ? 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-6' : 'min-h-0 flex-1'}>{renderActualTool()}</div>
    </div>
  );
}
