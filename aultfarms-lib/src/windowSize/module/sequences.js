import { moduleState } from 'cerebral';

export const resized = [ 
  ({windowSize,props,store,get}) => { 
    if (get(moduleState`orientation`) !== windowSize.orientation()) {
      store.set(moduleState`orientation`, windowSize.orientation());
    }
    const isSmall = (windowSize.orientation() === 'portrait' ? (props.width < 767) : (props.height < 500));
    if (get(moduleState`isSmall`) !== isSmall) store.set(moduleState`isSmall`, isSmall);
  } 
];

export const init = [
  ({windowSize}) => windowSize.init('windowSize.resized'), // registers event listener for window resize events
  resized, // load dimensions the first time
];


