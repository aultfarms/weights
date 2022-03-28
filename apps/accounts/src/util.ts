import * as React from 'react';
import debug from 'debug';

const warn = debug('af/accounts#util:warn');

export function maintainScroll(containerId: string, action: (param: number) => any, value: number): void {
  React.useLayoutEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) {
      warn('WARNNING: element with id ', containerId, ' was not found');
    } else {
      el.scrollTop = value
    }
    return () => { // run this on unmount to save last scroll position
      if (el) {
        action(el.scrollTop || 0);
      }
    };
  }, []); // run once when mounted
}

