import type * as accounts from '../../browser/index.js';
import chalk from 'chalk';
import debug from 'debug';

// accountsTests has all the universal tests
import accountsTests from '../accounts.test.js';
import googleTests from './google.test.js';
import spreadsheetTests from './spreadsheets.test.js';
import inventoryTests from './inventory.test.js';

const info = debug('af/accounts#test:info');

const { red, cyan } = chalk;

type WindowWithLibs = {
  libsundertest: typeof accounts,
};

localStorage.debug = '*';

const pathroot = `/AF-AUTOMATEDTESTS/TEST-${+(new Date())}`;
const sourceAccountsDir = `/AF-TESTACCOUNTS`;

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
        accountsdir: sourceAccountsDir,
      });

      await inventoryTests(libsundertest, pathroot, sourceAccountsDir);

      // Run any browser-specific tests:
      await googleTests(libsundertest, pathroot);
      // Run browser-specific file download from xlsx library
      // This is really only testing xlsx's ability to download, no need to keep this test in play most of the time
      await spreadsheetTests(/*libsundertest*/);

      info(`Browser account tests: have ${cyan(testsheets.length)} accounts loaded from Google at /AF-TESTACCOUNTS, starting tests...`);
      // run the universal tests:
      await accountsTests(universal_accounts, testsheets);


    } catch(e: any) {
      info(red('FAILED: tests threw exception: '), e);
    }
  }

});

