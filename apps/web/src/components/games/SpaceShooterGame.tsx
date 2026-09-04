import TomJerryCinematicGame, {
  type TomJerryCinematicGameProps,
} from './TomJerryCinematicGame';

/** Retro arcade boss-battle skin of the cinematic script player. */
export default function SpaceShooterGame(props: Omit<TomJerryCinematicGameProps, 'templateId'>) {
  return <TomJerryCinematicGame {...props} templateId="space_shooter" />;
}
