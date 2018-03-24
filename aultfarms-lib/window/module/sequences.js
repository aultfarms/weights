
export const resized = [ 
  ({window,props,state}) => { 
    if (state.get('window.orientation') !== window.orientation()) state.set('window.orientation', window.orientation());
    const isSmall = (window.orientation() === 'portrait' ? (props.width < 767) : (props.height < 500));
    if (state.get('window.isSmall') !== isSmall) state.set('window.isSmall', isSmall);
  } 
];

export const init = [
  ({window}) => window.init('window.resized'), // registers event listener for window resize events
  resized, // load dimensions the first time
];


