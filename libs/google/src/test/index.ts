import type * as google from '../';

import googleTests from './google.test.js';

type WindowWithLibs = {
  libsundertest: typeof google
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

    await googleTests(libsundertest);
  }

});

