import {
  isPlatformOwner,
  TEACHER_TOOLS_CATALOG,
  type AiToolPlan,
  type TeacherToolDefinition,
} from '@brightpath/shared';

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
  const normalized = appRole?.trim().toLowerCase().replace(/-/g, '_');
  if (!normalized) return null;
  if (normalized === 'org_admin' || normalized === 'school_admin' || normalized === 'school') return 'school';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'owner' || normalized === 'super_admin') return 'admin';
  if (normalized === 'center_admin' || normalized === 'academy') return 'academy';
  if (normalized === 'teacher' || normalized === 'parent' || normalized === 'student') return normalized;
  return null;
}

export function getRegistryTool(id: string): ToolDefinition | undefined {
  return INITIAL_TOOLS_REGISTRY.find((tool) => tool.id === id);
}

/** Platform owner may run every tool. Every other role must be listed on the tool. */
export function canUserAccessTool(
  user: { role?: string | null; email?: string | null } | null,
  toolAllowedRoles: string[],
): boolean {
  if (!user) return false;
  if (isPlatformOwner(user.role, user.email)) return true;
  if (!toolAllowedRoles?.length) return false;
  const role = registryRole(user.role);
  if (!role) return false;
  return toolAllowedRoles.map((item) => item.toLowerCase()).includes(role);
}

export function toolsForAppRole(appRole: string | null | undefined, email?: string | null): ToolDefinition[] {
  if (isPlatformOwner(appRole, email)) return INITIAL_TOOLS_REGISTRY;
  const role = registryRole(appRole);
  if (!role) return [];
  return INITIAL_TOOLS_REGISTRY.filter((tool) => tool.allowedRoles.includes(role));
}

export function toolVisibleToRole(
  toolId: string,
  appRole: string | null | undefined,
  email?: string | null,
): boolean {
  const tool = getRegistryTool(toolId);
  if (!tool) return false;
  return canUserAccessTool({ role: appRole, email }, tool.allowedRoles);
}
