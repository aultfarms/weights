import type * as Trello from '../../browser/index.js';
import debug from 'debug';

// trello.test.js has all the universal tests
import trelloTests from '../trello.test.js';

const info = debug('af/trello#test/browser:info');

type WindowWithLibs = typeof window & {
  libsundertest: typeof Trello,
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

    try {
      console.log('Starting tests, should see info statements after this');
      const client = libsundertest.getClient();

      info('Testing trello universal...');
      await trelloTests(client, libsundertest);

    } catch(e: any) {
      info('FAILED: tests threw exception: ', e);
    }
  }

});

