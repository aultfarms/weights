
export const resized = [ 
  ({windowSize,props,state}) => { 
    if (state.get('windowSize.orientation') !== windowSize.orientation()) state.set('windowSize.orientation', windowSize.orientation());
    const isSmall = (windowSize.orientation() === 'portrait' ? (props.width < 767) : (props.height < 500));
    if (state.get('windowSize.isSmall') !== isSmall) state.set('windowSize.isSmall', isSmall);
  } 
];

export const init = [
  ({windowSize}) => windowSize.init('windowSize.resized'), // registers event listener for window resize events
  resized, // load dimensions the first time
];


