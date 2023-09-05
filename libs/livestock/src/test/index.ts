import type * as livestock from '../';
import debug from 'debug';

import recordsTests from './records.test.js';
import weightsTests from './weights.test.js';

const info = debug('af/livestock#test/index:info');

type WindowWithLibs = {
  libsundertest: typeof livestock 
};

localStorage.debug = '*,-*drive:trace';

// Wait for the window to finish loading
document.addEventListener('DOMContentLoaded', async () => {

  const libsundertest = (window as unknown as WindowWithLibs).libsundertest;

  const root = document.getElementById("root");
  if (!root) {
    console.log('ERROR: did not find root element!');
  } else {
    root.innerHTML = "The test is running!"

    info('records tests:');
    await recordsTests(libsundertest);

    info('weights tests:');
    await weightsTests(libsundertest);
  }

});

