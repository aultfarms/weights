
import { state, IndexedStatements } from './state';
import { activity, errors, stepResult, balancesheets, profitlosses, selectedAccountName } from './actions';
import debug from 'debug';
import { ledger as ledger, err, balance, profitloss, google } from '@aultfarms/accounts';

const info= debug("accounts#initialize:info");
const warn = debug("accounts#initialize:warn");

export const initialize = async () => {

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
  const printcats = Object.keys(ledger.categorySchemas).map(k => k.split('!')[0]).join(', ');
  activity(`Checking that all notes have required structure for these categories since ${startDate}: ${printcats}`);
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

  activity(`Checking for any transactions labeled with top-level categories that should have been more specific since ${startDate}`);
  for (const type of ([ 'tax', 'mkt' ] as ('tax' | 'mkt')[]) ) {
    try {
      const errs = ledger.validateNoOneLevelCategories({account: final[type], startDate });
      if (!errs) continue;
      for (const {line, error} of errs) {
        const le = new err.LineError({ line, msg: error });
        activity(le.msgs(),'bad');
        errors(le.msgs());
      }
    } catch(e: any) {
      activity(`ERROR: could not validate notes, error was: ${e.toString()}`, 'bad');
      errors(e.toString());
    }
  }

  // Finally, select the final market account by default, then autorun should grab the final.mkt
  // Currently, this is broken, it hangs the webpage.  I think I need to use "computed" from mobx,
  // and then maybe I don't need "BigData"?
  //selectedAccountName('All');
  

  // Debugging: grab every category, filter all the lines in "All" to that category
  // loop through 2020, 2021, 2022
  // Sum up all those credit/debit's, compare with profit/loss's total.  
  // If they don't match, you can always compare the lines then
  /*
  const unique_categories = final.mkt.lines.map(l => l.category).filter((val, index, self) => self.indexOf(val) === index);
  for (const cat of unique_categories) {
    let lines = final.mkt.lines.filter(l => l.category.startsWith(cat));
    for (const year of [2021, 2020]) {
      let amt = 0;
      let cdt = 0;
      let dbt = 0;
      const yearlines = lines.filter(l => l.date.year() === year);
      for (const l of yearlines) {
        amt += l.amount;
        if (l.amount > 0) cdt += l.amount;
        if (l.amount < 0) dbt += l.amount;
      }
      // Now, check this year's profit-loss amount for this category:
      const pls = profitlosses();
      if (!pls) throw new Error('somehow we have no profitosses');
      const pl = (pls[''+year]!.mkt as profitloss.ProfitLoss);
      const tree = profitloss.getCategory(pl.categories, cat);
      let plamt = 0;
      let plcdt = 0;
      let pldbt = 0;
      if (tree) {
        plamt = profitloss.amount(tree);
        plcdt = profitloss.credit(tree);
        pldbt = profitloss.debit(tree);
      }
      if (cat === 'START') continue;
      if (!(Math.abs(plamt - amt) < 0.01)) {
        info(`Have ${yearlines.length} lines in yearlines, and ${tree!.transactions.length} in tree.transactions`);
        if (tree) {
          info(`Have ${Object.keys(tree.children).length} children on tree`);
        }
        for (const [index, l] of yearlines.entries()) {
          const plline = tree!.transactions[index];
          if (!plline) info(`Line ${index} exists in yearlines but not in transactions`);
          else {
            if (plline.date !== l.date || plline.amount !== l.amount) {
              info(`Line ${index} is different! (date,amt) => allcat (${l.date.format('YYYY-MM-DDTHH:mm:ss')}, ${l.amount}) vs. p&l (${plline.date.format('YYYY-MM-DDTHH:mm:ss')}, ${plline.amount})`);
            }
          }
        }
        throw new Error(`PROFITLOSS FAILURE: year ${year}, category ${cat}: plamt (${plamt}) !== amt (${amt})`);
      }
    }
  }*/

  /*
  // Using the "all" account, find the balance, and add up all the transactions.  Figure out 
  // which one is wrong compared to what's on the web.
  for (const year of [ 2020, 2021, 2022 ]) {
    const mktlines = final.mkt.lines.filter(l => l.date.year() === year);
    const bal = mktlines[mktlines.length-1]!.balance;
    const plval = mktlines.reduce((acc,l) => acc+l.amount, 0);
    info(`For All: Balance for ${year} is: ${bal}`);
    info(`For All: P&L for ${year} is: ${plval}`);
  }
  */
  
};

