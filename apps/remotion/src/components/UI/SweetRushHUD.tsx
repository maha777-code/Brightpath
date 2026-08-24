import React from 'react';
import { SweetRushHud } from '../SweetRushHud';

export const SweetRushHUD: React.FC<{
  topicTitle: string;
  phaseTitle?: string;
  phase?: string;
  pattern?: string;
  progress01?: number;
  voiceover?: string;
  leftConcept?: string;
  rightConcept?: string;
  badges?: string[];
  takeawayBadge?: string;
  stepLabels?: string[];
}> = ({ phaseTitle, phase, progress01 = 0, ...rest }) => {
  return (
    <SweetRushHud
      {...rest}
      phase={phaseTitle || phase}
      progress01={progress01}
    />
  );
};

export { SweetRushHud };
