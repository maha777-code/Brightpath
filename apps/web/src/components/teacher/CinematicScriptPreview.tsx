import { useMemo } from 'react';
import type { CinematicScriptScene, TeacherActivity } from '@brightpath/shared';
import { questionLoopsFromScript, resolveActivityScript } from '@brightpath/shared';

function sceneLabel(scene: CinematicScriptScene, questionNumber: number): string {
  switch (scene.scene_type) {
    case 'setup':
      return 'Setup';
    case 'question_loop':
      return `Q${questionNumber}`;
    case 'correct_outcome':
      return 'Correct';
    case 'incorrect_outcome':
      return 'Incorrect';
    case 'completed':
      return 'Finale';
    default:
      return 'Scene';
  }
}

function sceneLine(scene: CinematicScriptScene): string {
  switch (scene.scene_type) {
    case 'setup':
      return scene.tom_dialogue;
    case 'question_loop':
      return scene.prompt;
    case 'correct_outcome':
    case 'incorrect_outcome':
      return scene.tom_dialogue_on_failure;
    case 'completed':
      return scene.jerry_dialogue || scene.tom_dialogue || 'Victory';
    default:
      return '';
  }
}

export function CinematicScriptPreview({
  activity,
  compact = false,
}: {
  activity: TeacherActivity;
  compact?: boolean;
}) {
  const script = useMemo(() => resolveActivityScript(activity), [activity]);
  const loops = questionLoopsFromScript(script);
  let questionCursor = 0;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className="text-xs font-bold uppercase tracking-wide text-amber-200">
        Cinematic Tom & Jerry · {loops.length} questions · {activity.totalXp} XP
      </p>
      <ol className="relative max-h-[280px] space-y-2 overflow-y-auto border-l border-amber-300/30 pl-4">
        {script.map((scene, index) => {
          if (scene.scene_type === 'question_loop') questionCursor += 1;
          const qn = questionCursor;
          return (
            <li key={`${scene.scene_type}-${index}`} className="relative">
              <span className="absolute -left-[1.35rem] top-2 h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-100/80">
                {sceneLabel(scene, qn)}
              </p>
              <p className="line-clamp-2 text-sm font-semibold text-white">{sceneLine(scene)}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
