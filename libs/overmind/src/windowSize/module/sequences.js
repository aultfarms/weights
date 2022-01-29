import { state,sequence } from 'cerebral';

export const resized = sequence('windowSize.resized', [ 
  ({windowSize,props,store,get}) => { 
    if (get(state`windowSize.orientation`) !== windowSize.orientation()) {
      store.set(state`windowSize.orientation`, windowSize.orientation());
    }
    const isSmall = (windowSize.orientation() === 'portrait' ? (props.width < 767) : (props.height < 500));
    if (get(state`windowSize.isSmall`) !== isSmall) store.set(state`windowSize.isSmall`, isSmall);
  } 
]);

export const init = sequence('windowSize.init', [
  ({windowSize}) => windowSize.init('windowSize.resized'), // registers event listener for window resize events
  resized, // load dimensions the first time
]);


