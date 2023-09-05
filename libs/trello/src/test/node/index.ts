import * as trelloNode from '../../node/index.js';
import debug from 'debug';
import trelloTests from '../trello.test.js';

const info = debug('af/trello-node:info');

(async function() {

  try {
    info('Getting universal client');
    const client = trelloNode.getClient();

    info('Testing universal trello tests');
    await trelloTests(client, trelloNode);
    info('All universal trello tests passed');

    info('All tests passed!');
  } catch(e) {
    info('FAILED: tests threw exception: ', e);
  }

})();
