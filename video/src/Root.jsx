import React from 'react';
import { Composition } from 'remotion';
import { Spec } from './Spec';

const sample = {
  durationSec: 6,
  beats: [
    { id: 'a', start: 0, end: 6, text: 'Preview', words: [{ w: 'Preview', s: 0.2, e: 0.8 }], visual: { type: 'text', highlight: [] } },
  ],
};

export const RemotionRoot = () => (
  <Composition
    id="Spec"
    component={Spec}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ spec: sample }}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(30, Math.ceil(props.spec.durationSec * 30)) })}
  />
);
