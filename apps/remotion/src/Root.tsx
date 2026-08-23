import React from 'react';
import { Composition } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { GamifiedLessonComposition, type GamifiedLessonProps } from './GamifiedLessonComposition';

const defaultProps: GamifiedLessonProps = {
  topicId: 'demo',
  topicTitle: 'Physical Nature of Matter',
  totalDurationSeconds: 25,
  archetype: 'experiment',
  pedagogicalPattern: 'lab_experiment',
  audioUrl: '',
  wordTimings: [],
  scriptData: undefined,
  scenes: [
    {
      sceneId: 1,
      duration: 6,
      phase: 'CHALLENGE',
      voiceoverText: 'Is matter continuous like a block of wood, or made of tiny particles like sand?',
      visualType: 'comparison_split',
      animationType: 'StateComparison',
      parameters: {
        leftConcept: 'Wood (Continuous)',
        rightConcept: 'Sand (Particulate)',
        accentColor: '#FF5722',
      },
      visualProps: {
        leftConcept: 'Wood (Continuous)',
        rightConcept: 'Sand (Particulate)',
        accentColor: '#FF5722',
      },
    },
    {
      sceneId: 2,
      duration: 12,
      phase: 'SIMULATION',
      voiceoverText: 'Add salt to a 100 millilitre beaker of water and stir — the crystals vanish.',
      visualType: '3d_beaker_experiment',
      animationType: 'TemperatureEffect',
      parameters: {
        container: '100mL Beaker',
        liquidLevel: 50,
        solute: 'Salt Crystals',
        action: 'dissolve_and_stir',
        waterLevelChanged: false,
        stepLabels: ['Add water', 'Add salt', 'Stir'],
      },
      visualProps: {
        container: '100mL Beaker',
        liquidLevel: 50,
        solute: 'Salt Crystals',
        action: 'dissolve_and_stir',
        waterLevelChanged: false,
      },
    },
    {
      sceneId: 3,
      duration: 7,
      phase: 'DISCOVERY',
      voiceoverText: 'Salt spheres slide into the empty spaces between water spheres.',
      visualType: '3d_particle_zoom',
      animationType: 'ParticleMotion3D',
      parameters: {
        primaryParticles: 'Water (Blue Spheres)',
        secondaryParticles: 'Salt (Yellow Spheres)',
        interstitialFitting: true,
        takeawayBadge: 'Matter is made of tiny particles with spaces between them!',
      },
      visualProps: {
        primaryParticles: 'Water (Blue Spheres)',
        secondaryParticles: 'Salt (Yellow Spheres)',
        interstitialFitting: true,
        takeawayBadge: 'Matter is made of tiny particles with spaces between them!',
      },
    },
  ],
};

function sceneDurationSum(props: GamifiedLessonProps): number {
  const scenes = props.scriptData?.scenes?.length ? props.scriptData.scenes : props.scenes;
  return (scenes ?? []).reduce((acc, s) => acc + Math.max(0, Number(s.duration) || 0), 0);
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GamifiedLesson"
        component={GamifiedLessonComposition}
        durationInFrames={21 * 30}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultProps}
        calculateMetadata={async ({ props }) => {
          let seconds =
            Number(props.scriptData?.totalDurationSeconds) ||
            Number(props.totalDurationSeconds) ||
            sceneDurationSum(props) ||
            21;

          const audioUrl = String(props.audioUrl || '').trim();
          if (/^https?:\/\//i.test(audioUrl)) {
            try {
              const audioSec = await getAudioDurationInSeconds(audioUrl);
              if (Number.isFinite(audioSec) && audioSec > 0) {
                seconds = audioSec;
              }
            } catch (err) {
              console.warn('[GamifiedLesson] audio duration probe failed, using script length', err);
            }
          }

          seconds = Math.max(8, seconds);
          return {
            durationInFrames: Math.ceil(seconds * 30),
            props: {
              ...props,
              totalDurationSeconds: seconds,
            },
          };
        }}
      />
    </>
  );
};
