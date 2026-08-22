import React from 'react';
import { Composition } from 'remotion';
import { GamifiedLessonComposition, type GamifiedLessonProps } from './GamifiedLessonComposition';

const defaultProps: GamifiedLessonProps = {
  topicId: 'demo',
  topicTitle: 'Physical Nature of Matter',
  totalDurationSeconds: 21,
  archetype: 'experiment',
  audioUrl: '',
  wordTimings: [],
  scenes: [
    {
      sceneId: 1,
      duration: 7,
      phase: 'Hook / Dilemma',
      voiceoverText: 'Is matter continuous like a block of wood, or made of tiny particles?',
      visualType: 'comparison_split',
      animationType: 'StateComparison',
      parameters: {
        leftLabel: 'Continuous',
        rightLabel: 'Particulate',
        primaryObject: 'Matter',
        showLabels: ['Continuous', 'Particulate'],
      },
      visualProps: {
        leftLabel: 'Continuous',
        rightLabel: 'Particulate',
      },
    },
    {
      sceneId: 2,
      duration: 7,
      phase: 'Core Activity / Demonstration',
      voiceoverText: 'Dissolve salt in water — particles occupy spaces between water particles.',
      visualType: 'lab_simulation',
      animationType: 'TemperatureEffect',
      parameters: {
        container: 'beaker',
        action: 'dissolve',
        primarySubstance: 'water',
        secondarySubstance: 'salt',
        temperature: 35,
        speedMultiplier: 1.4,
        showLabels: ['Dissolve'],
      },
      visualProps: {
        container: 'beaker',
        action: 'dissolve',
        primarySubstance: 'water',
        secondarySubstance: 'salt',
      },
    },
    {
      sceneId: 3,
      duration: 7,
      phase: 'Microscopic / Conceptual Discovery',
      voiceoverText: 'At the micro scale, salt spheres fill gaps between water spheres.',
      visualType: 'particle_zoom',
      animationType: 'ParticleMotion3D',
      parameters: {
        particleTypeA: 'blue_water_spheres',
        particleTypeB: 'yellow_salt_spheres',
        keyTakeaway: 'Matter is particulate — tiny particles with spaces between them.',
        particleDensity: 'high',
        showLabels: ['Key Takeaway'],
      },
      visualProps: {
        particleTypeA: 'blue_water_spheres',
        particleTypeB: 'yellow_salt_spheres',
        keyTakeaway: 'Matter is particulate — tiny particles with spaces between them.',
      },
    },
  ],
};

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
        calculateMetadata={({ props }) => {
          const seconds = Math.max(8, Number(props.totalDurationSeconds) || 21);
          return {
            durationInFrames: Math.ceil(seconds * 30),
            props,
          };
        }}
      />
    </>
  );
};
