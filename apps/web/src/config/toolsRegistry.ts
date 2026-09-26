import { TEACHER_TOOLS_CATALOG, type AiToolPlan, type TeacherToolDefinition } from '@brightpath/shared';

/** Registry roles. School is org_admin, academy is center_admin. */
export type UserRole = 'admin' | 'school' | 'academy' | 'teacher' | 'parent' | 'student';

export type ToolComponentKey =
  | 'WorksheetGenerator'
  | 'QuizGenerator'
  | 'LessonPlanGenerator'
  | 'SongGenerator'
  | 'CurriculumStudio'
  | 'CustomDynamicTool';

export interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  category: 'Assessment' | 'Planning' | 'Content Creation' | 'Utility';
  icon: string;
  allowedRoles: UserRole[];
  targetPlan: 'Free' | 'Pro' | 'Enterprise';
  componentKey: ToolComponentKey;
  requiredPlan: AiToolPlan;
  isCustomAdminTool?: boolean;
}

const COMPONENT_KEYS: Record<string, ToolComponentKey> = {
  'worksheet-generator': 'WorksheetGenerator',
  'quiz-generator': 'QuizGenerator',
  'lesson-plan': 'LessonPlanGenerator',
  'song-generator': 'SongGenerator',
  'curriculum-studio': 'CurriculumStudio',
};

function categoryFor(tool: TeacherToolDefinition): ToolDefinition['category'] {
  if (tool.focusArea === 'assessment') return 'Assessment';
  if (tool.focusArea === 'curriculum') return 'Planning';
  if (tool.focusArea === 'communication') return 'Utility';
  return 'Content Creation';
}

function targetPlan(plan: AiToolPlan): ToolDefinition['targetPlan'] {
  if (plan === 'center_pro') return 'Enterprise';
  if (plan === 'pro') return 'Pro';
  return 'Free';
}

function allowedRoles(tool: TeacherToolDefinition): UserRole[] {
  if (tool.id === 'curriculum-studio') {
    return ['admin', 'school', 'academy', 'teacher', 'parent'];
  }
  if (tool.requiredPlan === 'center_pro') return ['admin', 'school', 'academy'];
  if (tool.requiredPlan === 'pro') return ['admin', 'school', 'academy', 'teacher'];
  return ['admin', 'school', 'academy', 'teacher', 'parent', 'student'];
}

export function toToolDefinition(tool: TeacherToolDefinition, custom = false): ToolDefinition {
  return {
    id: tool.id,
    title: tool.title,
    description: tool.description,
    category: categoryFor(tool),
    icon: tool.icon,
    allowedRoles: allowedRoles(tool),
    targetPlan: targetPlan(tool.requiredPlan),
    componentKey: COMPONENT_KEYS[tool.id] ?? 'CustomDynamicTool',
    requiredPlan: tool.requiredPlan,
    isCustomAdminTool: custom || undefined,
  };
}

export const INITIAL_TOOLS_REGISTRY: ToolDefinition[] = TEACHER_TOOLS_CATALOG.map((tool) =>
  toToolDefinition(tool),
);

export function registryRole(appRole: string | null | undefined): UserRole | null {
  if (appRole === 'org_admin' || appRole === 'owner' || appRole === 'super_admin') return 'school';
  if (appRole === 'center_admin') return 'academy';
  if (appRole === 'teacher' || appRole === 'parent' || appRole === 'student') return appRole;
  return null;
}

export function getRegistryTool(id: string): ToolDefinition | undefined {
  return INITIAL_TOOLS_REGISTRY.find((tool) => tool.id === id);
}

export function toolsForAppRole(appRole: string | null | undefined): ToolDefinition[] {
  const role = registryRole(appRole);
  if (!role) return [];
  return INITIAL_TOOLS_REGISTRY.filter((tool) => tool.allowedRoles.includes(role));
}

export function toolVisibleToRole(toolId: string, appRole: string | null | undefined): boolean {
  const role = registryRole(appRole);
  const tool = getRegistryTool(toolId);
  if (!role || !tool) return false;
  return tool.allowedRoles.includes(role);
}
