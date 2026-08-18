import React from 'react';
import { Composition } from 'remotion';
import { GamifiedLessonComposition, type GamifiedLessonProps } from './GamifiedLessonComposition';

const defaultProps: GamifiedLessonProps = {
  topicId: 'demo',
  topicTitle: 'Physical Nature of Matter',
  totalDurationSeconds: 30,
  audioUrl: '',
  wordTimings: [],
  scenes: [
    {
      sceneId: 1,
      duration: 10,
      voiceoverText: 'Matter is made up of tiny particles.',
      animationType: 'ParticleMotion3D',
      parameters: {
        particleDensity: 'high',
        temperature: 25,
        speedMultiplier: 1.5,
        showLabels: ['Molecules', 'Kinetic Energy'],
      },
    },
    {
      sceneId: 2,
      duration: 10,
      voiceoverText: 'Heat increases particle motion.',
      animationType: 'TemperatureEffect',
      parameters: {
        particleDensity: 'medium',
        temperature: 60,
        speedMultiplier: 1.8,
        showLabels: ['Heat', 'Energy'],
      },
    },
    {
      sceneId: 3,
      duration: 10,
      voiceoverText: 'Remember: particles are always moving.',
      animationType: 'ConceptCallout',
      parameters: {
        particleDensity: 'low',
        temperature: 30,
        speedMultiplier: 1.1,
        showLabels: ['Key Takeaway'],
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
        durationInFrames={30 * 30}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(8, Number(props.totalDurationSeconds) || 30);
          return {
            durationInFrames: Math.ceil(seconds * 30),
            props,
          };
        }}
      />
    </>
  );
};
