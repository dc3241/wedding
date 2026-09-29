import React from 'react';
import {Still, registerRoot, continueRender, delayRender} from 'remotion';
import {Slide} from './Slide.jsx';
import {loadBrandFonts, formats} from './brand.js';

const SlideWithFonts = ({spec, width, height}) => {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    loadBrandFonts().then(() => continueRender(handle));
  }, [handle]);
  return <Slide spec={spec} width={width} height={height} />;
};

const defaultSpec = {
  format: 'pin',
  layout: 'statement',
  theme: 'blush',
  headline: 'Your seating chart shouldn’t live on a sticky note.',
  data: {highlight: 'sticky note'},
  support: 'Build it once, share it with your venue.',
};

const Root = () => (
  <Still
    id="Slide"
    component={SlideWithFonts}
    width={1000}
    height={1500}
    defaultProps={{spec: defaultSpec, width: 1000, height: 1500}}
    calculateMetadata={({props}) => {
      const [width, height] = formats[props.spec.format] || formats.pin;
      return {width, height, props: {...props, width, height}};
    }}
  />
);

registerRoot(Root);
