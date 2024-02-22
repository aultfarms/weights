import type * as livestock from '../';
import debug from 'debug';

import feedTests from './feed.test.js';
import grainTests from './grain.test.js';

const info = debug('af/trucking#test/index:info');

type WindowWithLibs = {
  libsundertest: typeof livestock 
};

// Wait for the window to finish loading
document.addEventListener('DOMContentLoaded', async () => {

  const libsundertest = (window as unknown as WindowWithLibs).libsundertest;

  const root = document.getElementById("root");
  if (!root) {
    console.log('ERROR: did not find root element!');
  } else {
    root.innerHTML = "The test is running!"

    info('feed tests:');
    await feedTests(libsundertest);

    info('grain tests:');
    await grainTests(libsundertest);
  }

});

