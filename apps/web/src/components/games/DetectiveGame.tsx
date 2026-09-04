import TomJerryCinematicGame, {
  type TomJerryCinematicGameProps,
} from './TomJerryCinematicGame';

/** Detective clue-quest skin of the cinematic script player. */
export default function DetectiveGame(props: Omit<TomJerryCinematicGameProps, 'templateId'>) {
  return <TomJerryCinematicGame {...props} templateId="detective_mystery" />;
}
