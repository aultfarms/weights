import { state } from './state';
import debug from 'debug';
import { windowSize, msg, records, loadWeights, moveTagInput, moveWeightInput, scrollToTag, appendNewRow, changeIsInitialized, changeTab } from './actions';
import * as livestock from '@aultfarms/livestock';
import { getClient as getTrelloClient } from '@aultfarms/trello';

const info = debug("weights/state#initialize:info");
const warn = debug("weights/state#initialize:warn");

async function breakExecution() {
  await new Promise(resolve => setTimeout(resolve, 1)); // break up the execution to allow UI updates
}

export const initialize = async () => {
  try {
    changeTab({ active: 'errors' });
    windowSize({ width: document.body.clientWidth, height: document.body.clientHeight });
    msg('Checking trello authorization...', 'bad');
    const trello = getTrelloClient();
    await trello.connect({ org: state.config.trelloOrg });
    msg('Trello successfully authorized.', 'good');

    msg('Authorizing Google...');
    await livestock.authorize();
    msg('Google successfully authorized');

    // Fire off these in parallel
    msg('Loading Trello and Google in parallel...')
    await Promise.all([
      (async () => {
        msg('Loading records from Trello...', 'bad');
        try {
          const r = await livestock.records.fetchRecords(trello);
          records(r);
        } catch(e: any) {
          msg('FAIL: could not load records from Trello!  Error was: '+e.toString());
          warn('FAIL: could not load records from Trello.  Error was: ', e);
          return;
        }
        msg('Records loaded from Trello', 'good');
      })(),
      (async () => {
      msg('Loading spreadsheets from Google...', 'bad');
        try {
          await loadWeights();
        } catch(e: any) {
          msg('FAIL: could not load spreadsheets from Google!  Error was: '+JSON.stringify(e));
          warn('FAIL: could not load spreadsheets from Google!  Error was: ', e);
          return;
        }
      })()
    ]);
    msg('All records and weights loaded');


    changeIsInitialized(true);

    msg('Loaded successfully.', 'good');
    changeTab({ active: 'weights' });

    const end = state.weights.length;
    if (end > 1) {
      moveTagInput(end);
      moveWeightInput(end);
    }

    scrollToTag();
  } catch(e: any) {
    msg('ERROR: could not initialize!  Error was: '+e.toString(), 'bad');
  }
}