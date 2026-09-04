import TomJerryCinematicGame, {
  type TomJerryCinematicGameProps,
} from './TomJerryCinematicGame';

/** SweetRush map-quest skin of the cinematic script player. */
export default function SweetRushQuestGame(props: Omit<TomJerryCinematicGameProps, 'templateId'>) {
  return <TomJerryCinematicGame {...props} templateId="sweetrush_quest" />;
}
