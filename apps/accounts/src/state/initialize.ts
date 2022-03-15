
import { action } from 'mobx';
import { state, IndexedStatements } from './state';
import { activity, errors, stepResult, balancesheets, profitlosses } from './actions';
import debug from 'debug';
import { ledger as ledger, err, balance, profitloss, google } from '@aultfarms/accounts';

const info= debug("accounts#initialize:info");
const warn = debug("accounts#initialize:warn");

export const onInitialize = action('onInitialize', async () => {

  if (state.config.accountsLocation.place !== 'google') {
    activity('ERROR: any place other that google is not currently supported');
    return;
  }

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
  let step;
  try {
    for await (step of ledger.loadInSteps({ rawaccts, status: activity })) {
      if (step && step.errors) {
        activity('ERROR ON STEP: '+step.step, 'bad');
        break;
      }
    }
    if (!step) {
      activity('ERROR: no step!', 'bad');
      return;
    }
    stepResult(step);
    if (step.errors && step.errors.length > 0) {
      activity(step.errors, 'bad');
      errors(step.errors);
      return;
    }
    if (!step.done) {
      activity('Did not finish loading', 'bad');
      return;
    }
    if (!step.final) {
      activity('Finished loading, but had no accounts!');
      return;
    }
    activity('Finished loading ledger, on to balance sheets and profit/loss statements...');
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

  const final = step?.final;
  if (!final) {
    warn('WARNING: steps all finished, but final is still falsey....');
    activity('ERROR: all ledger loading steps finished, but had no resulting accounts!');
    return;
  }
  activity('Finished putting ledger into the state, on to balance sheets and profit/loss statements...');

  // Create balance sheets and P&L for every year from 2020 forward
  let bss: IndexedStatements<balance.AnnualBalanceSheet> = {}; 
  let pls: IndexedStatements<profitloss.ProfitLoss> = {};
  try {
    const now = (new Date()).getFullYear();
    info('now = ', now);
    activity('******** balance sheet and profit loss ********');
    for (let year=2020; year <= now; year++) {
      activity(`Creating balance sheet for year ${year}`);
      bss[year] = {
        tax: await balance.annualBalanceSheet({ year, type: 'tax', ledger: final }),
        mkt: await balance.annualBalanceSheet({ year, type: 'mkt', ledger: final }),
      };
      activity(`Creating profit/loss statement for year ${year}`);
      pls[year] = {
        tax: profitloss.profitLoss({ year, type: 'tax', ledger: final }),
        mkt: profitloss.profitLoss({ year, type: 'mkt', ledger: final }),
      };
    }
    balancesheets(bss);
    profitlosses(pls);
    activity('Successfully created balance sheet and profit/loss statements');

  } catch(e: any) {
    warn('Could not create balance sheets and P&L statements, error = ', e);
    if (typeof e.msgs === 'function') {
      activity(e.msgs(), 'bad');
      errors(e.msgs());
      
    } else if (typeof e.message === 'string') {
      activity(e.message, 'bad');
    }
    activity('Error: could not load accounts', 'bad');
    return;
  }

  const startDate = '2020-12-31';
  activity(`Checking that all notes have required structure for these categories since ${startDate}: ${Object.keys(ledger.categorySchemas).join(', ')}`);
  for (const type of ([ 'tax', 'mkt' ] as ('tax' | 'mkt')[]) ) {
    try {
      const results = ledger.validateNotesAllSchemas({account: final[type], startDate });
      for (const [catname, caterrors] of Object.entries(results)) {
        if (caterrors) {
          for (const e of caterrors) {
            const le = new err.LineError({ line: e.line, msg: `${type}: Line had category ${e.line.category}, but note failed validation with this error: ${e.error} `});
            activity(le.msgs(),'bad');
            errors(le.msgs());
          }
        }
      }
    } catch(e: any) {
      activity(`ERROR: could not validate notes, error was: ${e.toString()}`, 'bad');
      errors(e.toString());
    }
  }

});

