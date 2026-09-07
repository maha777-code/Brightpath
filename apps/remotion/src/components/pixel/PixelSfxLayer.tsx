import React from 'react';
import { AbsoluteFill, Audio } from 'remotion';
import { sfxFlashColor, sfxSrc } from './pixelSfx';

export const PixelSfxLayer: React.FC<{
  trigger?: string;
  sceneStartFrame: number;
}> = ({ trigger }) => {
  const src = sfxSrc(trigger);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <Audio src={src} volume={0.5} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: sfxFlashColor(trigger),
          opacity: 0.18,
        }}
      />
    </AbsoluteFill>
  );
};
