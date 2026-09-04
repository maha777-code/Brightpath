import {
  resolveActivityTemplateId,
  type CinematicScriptScene,
  type TeacherActivity,
} from '@brightpath/shared';
import TomJerryCinematicGame from './TomJerryCinematicGame';
import SpaceShooterGame from './SpaceShooterGame';
import DetectiveGame from './DetectiveGame';
import SweetRushQuestGame from './SweetRushQuestGame';

interface ActivityGamePlayerProps {
  activity: TeacherActivity;
  script?: CinematicScriptScene[];
  title?: string;
  totalXp?: number;
  onExit?: () => void;
  onComplete?: (xpEarned: number) => void;
}

export default function ActivityGamePlayer({
  activity,
  script,
  title,
  totalXp,
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

  if (templateId === 'space_shooter') {
    return <SpaceShooterGame {...shared} />;
  }
  if (templateId === 'detective_mystery') {
    return <DetectiveGame {...shared} />;
  }
  if (templateId === 'sweetrush_quest') {
    return <SweetRushQuestGame {...shared} />;
  }
  return <TomJerryCinematicGame {...shared} templateId="tom_and_jerry" />;
}
