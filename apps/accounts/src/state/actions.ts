import { action } from 'mobx';
//import type { Context } from './index.js';
import { state } from './state';
import chalk from 'chalk';
import debug from 'debug';
import { ledger, google } from '@aultfarms/accounts';

const warn = debug("accounts#actions:warn");
//const info = debug("accounts#actions:info");

export const onInitialize = action('onInitialize', async () => {

  if (state.config.accountsLocation.place === 'google') {

    // Read the accounts:
    let rawaccts = null;
    try {
      rawaccts = await google.readAccountsFromGoogle({ 
        accountsdir: state.config.accountsLocation.path, 
        status: activity
      });
    } catch(e) {
      warn('Could not readAccountsFromGoogle.  Error was: ', e);
      activity('Error: Could not read accounts from google', 'bad');
      return;
    }

    // Process them into a ledger:
    try {
      let step;
      for await (step of ledger.loadInSteps({ rawaccts, status: activity })) {
        if (step && step.errors) {
          activity('ERROR ON STEP: '+step.step);
          activity(step.errors);
          break;
        }
      }
      if (!step) {
        activity('ERROR: no step!');
      } else if (step.errors && step.errors.length > 0) {
        activity(step.errors);
      }
    } catch (e) {
      warn('Could not process accounts into ledger, error = ', e);
      activity('Error: could not process accounts into ledger', 'bad');
      return;
    }

  } else {
    activity('ERROR: any place other that google is not currently supported');
  }
});

export const changeIt = action('changeIt', (hello: string) => {
  state.hello = hello;
});

export const activity = action('activity', (msg: string | string[], type: 'good' | 'bad' = 'good') => {
  const color = type === 'good' ? chalk.green : chalk.red;
  if (typeof msg === 'string') msg = [ msg ];
  state.activityLog = [...state.activityLog, ...(msg.map(m => color(m)))];
});
