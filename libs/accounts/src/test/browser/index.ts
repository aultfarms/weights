import type * as accounts from '../../browser/index.js';
import chalk from 'chalk';
import debug from 'debug';

import accountsTests from '../accounts.test.js';
import googleTests from './google.test.js';

const info = debug('af/accounts#test:info');

const { red, cyan } = chalk;

type WindowWithLibs = {
  libsundertest: typeof accounts,
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

    const { google, ...universal_accounts } = libsundertest;
    // Grab the sheets from google:
    try {
      const testsheets = await google.readAccountsFromGoogle({ 
        status: info, 
        accountsdir: '/AF-TESTACCOUNTS' 
      });

      // Run any browser-specific tests:
      await googleTests(libsundertest);
      info(`Browser account tests: have ${cyan(testsheets.length)} accounts loaded from Google at /AF-TESTACCOUNTS, starting tests...`);
      // Run the account tests:
      await accountsTests(universal_accounts, testsheets);
    } catch(e: any) {
      info(red('FAILED: tests threw exception: '), e);
    }
  }

});

