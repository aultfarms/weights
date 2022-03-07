import { action } from 'mobx';
//import type { Context } from './index.js';
import { state, ActivityMessage, State } from './state';
import debug from 'debug';
import { ledger, google } from '@aultfarms/accounts';

const warn = debug("accounts#actions:warn");
//const info = debug("accounts#actions:info");

export const page = action('page', (page: State['page']) => {
  state.page = page;
});

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
          activity('ERROR ON STEP: '+step.step, 'bad');
          break;
        }
      }
      if (!step) {
        activity('ERROR: no step!', 'bad');
      } else if (step.errors && step.errors.length > 0) {
        activity(step.errors, 'bad');
        errors(step.errors);
        stepResult(step);
      } else if (!step.done) {
        activity('Did not finish loading, but no errors reported?', 'bad');
        stepResult(step);
      }
    } catch (e: any) {
      warn('Could not process accounts into ledger, error = ', e);
      if (typeof e.msgs === 'function') {
        activity(e.msgs(), 'bad');
        errors(e.msgs());
        
      } else if (typeof e.message === 'string') {
        activity(e.message, 'bad');
      }
      activity('Error: could not process accounts into ledger', 'bad');
      return;
    }

  } else {
    activity('ERROR: any place other that google is not currently supported');
  }
});

export const activity = action('activity', (msg: string | string[] | ActivityMessage | ActivityMessage[], type: ActivityMessage['type'] = 'good') => {
  if (!Array.isArray(msg)) {
    msg = [ msg ] as string[] | ActivityMessage[];
  }
  // Make sure evey element is an activity message (convert strings):
  const msgs: ActivityMessage[] = msg.map(m => {
    if (typeof m === 'object' && 'msg' in m && typeof m.msg === 'string') {
      return m as ActivityMessage;
    } else {
      return { msg: m, type} as ActivityMessage;
    }
  });

  state.activityLog = [...state.activityLog, ...msgs ];
});

export const errors = action('errorrs', (errs: string[]) => {
  state.errors = [ ...state.errors, ...errs ];
});

export const stepResult = action('stoppedOnStep', (step: ledger.StepResult) => {
  state.stepResult = step;
});

export const selectedAccountName = action('selectedAccountName', (sel: string | null) => {
  state.selectedAccountName = sel || '';
});
