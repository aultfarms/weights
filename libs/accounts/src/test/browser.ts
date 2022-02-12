import type { accounts } from '../';
export type { accounts };

import accountsTests from './accounts/accounts.test.js';

type WindowWithLibs = {
  libsundertest: {
    accounts: typeof accounts,
  },
};

localStorage.debug = '*';

// Wait for the window to finish loading
document.addEventListener('DOMContentLoaded', async () => {

  const libsundertest = (window as unknown as WindowWithLibs).libsundertest;

  const root = document.getElementById("root");
  if (!root) {
    console.log('ERROR: did not find root element!');
  } else {
    root.innerHTML = "The test is running!  Check the console."

    // Run the google tests:
    await accountsTests(libsundertest.accounts);
  }

});

