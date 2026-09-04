import {
  resolveActivityTemplateId,
  type CinematicScriptScene,
  type TeacherActivity,
} from '@brightpath/shared';
import TomJerryCinematicGame from './TomJerryCinematicGame';
import SpaceShooterGame from './SpaceShooterGame';
import DetectiveGame from './DetectiveGame';
import SweetRushQuestGame from './SweetRushQuestGame';
import PhysicsActivityGame from './PhysicsActivityGame';

interface ActivityGamePlayerProps {
  activity: TeacherActivity;
  script?: CinematicScriptScene[];
  title?: string;
  totalXp?: number;
  /** Force Box3D physics player when true. */
  preferPhysics?: boolean;
  onExit?: () => void;
  onComplete?: (xpEarned: number) => void;
}

export default function ActivityGamePlayer({
  activity,
  script,
  title,
  totalXp,
  preferPhysics,
  onExit,
  onComplete,
}: ActivityGamePlayerProps) {
  const templateId = resolveActivityTemplateId(activity);
  const shared = {
    activity,
    script,
    title: title ?? activity.title,
    totalXp: totalXp ?? activity.totalXp,
    onExit,
    onComplete,
  };

  const usePhysics =
    preferPhysics === true ||
    templateId === 'space_shooter' ||
    templateId === 'sweetrush_quest';

  if (usePhysics) {
    return <PhysicsActivityGame {...shared} />;
  }

  if (templateId === 'detective_mystery') {
    return <DetectiveGame {...shared} />;
  }
  if (templateId === 'space_shooter') {
    return <SpaceShooterGame {...shared} />;
  }
  if (templateId === 'sweetrush_quest') {
    return <SweetRushQuestGame {...shared} />;
  }
  return <TomJerryCinematicGame {...shared} templateId={templateId} />;
}
