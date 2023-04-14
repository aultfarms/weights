import moment from 'moment';
import momentrange from 'moment-range';
import { isStart, moneyEquals } from '../ledger/util.js';
import type { FinalAccounts, AccountTx } from '../ledger/types.js';
import { MultiError } from '../err.js';
import { stringify } from '../stringify.js';
import rfdc from 'rfdc';
//import debug from 'debug';
import { type Ten99Settings, type Ten99SettingsCategory, type Ten99SettingsPerson, importSettings } from './settings.js';

//const trace = debug('af/accounts#ten99:trace');

export { ten99ToWorkbook } from './exporter.js';

export { type Ten99Settings, type Ten99SettingsPerson, type Ten99SettingsCategory, importSettings };

export { moneyEquals }; // mainly for tests

const deepclone = rfdc({ proto: true });
// Have to jump through some hoops to get TS and node both happy w/ moment-range:
const { extendMoment } = momentrange;
const { range } = extendMoment({ ...moment, default: moment});

// You can pass this to array.filter and get only unique strings/numbers back
function uniqueFilter(value: any, index: number, self: any[]) {
  return self.indexOf(value) === index;
}


export type Ten99SummaryCategory = {
  name: string,
  amount: number,
  lines: AccountTx[],
};

export type Ten99Entry = {
  person: Ten99SettingsPerson,
  lines: AccountTx[],
  categories: Ten99SummaryCategory[],
  total: number,
};

export type Annual1099 = Ten99Entry[];

export type Ten99Result = {
  ten99: Annual1099,
  missing_people_from_required_categories: {
    [category: string]: string[],
  }
};

export function ten99(
  { ledger, year, settings }:
  { ledger: FinalAccounts, year: number, settings: Ten99Settings }
): Ten99Result {
  const lines = ledger.tax.lines; // 1099's only ever come from tax ledger

  // figure out all included years from transactions
  const years: number[] = lines.map(l => l.date.year()).filter(uniqueFilter);
  if (!years.find(y => y===year)) {
    throw new MultiError({ msg: `ERROR: requested year ${year} for tax ledger does not exist in list of years from transactions (${stringify(years)})` });
  }

  const annual: Annual1099 = [];
  const timerange = range(moment(year+'-01-01 00:00:00'), moment(year+'-12-31 23:59:59'));
  const tlines = deepclone(lines.filter(t => 
    !isStart(t) && 
    t.date && 
    t.date.isValid() && 
    timerange.contains(t.date)
  ));

  for (const person of settings.people) {
    let allnames = [ person.name, ...(person.othernames || []) ];

    // Filter for this payee:
    const personlines = tlines.filter(l => !!allnames.find(a => fuzzyCleanup(a) === fuzzyCleanup(l.who)));
    const entry: Ten99Entry = {
      person,
      lines: personlines,
      categories: [],
      total: 0,
    };

    // Compute summary from given category regexp's only:
    // This leaves in the transactions list everything we paid them, but
    // only totals up the categories that constitute a 1099
    for (const c of settings.categories) {
      const catlines = personlines.filter(l => l.category.match(categoryRegExp(c.name)));
      const summary: Ten99SummaryCategory = {
        name: c.name,
        lines: catlines,
        amount: catlines.reduce((sum,l) => sum + l.amount, 0),
      };
      if (summary.amount !== 0) entry.categories.push(summary);
    }

    // Sum up all the category summaries to get the 1099 total
    entry.total = entry.categories.reduce((sum,s) => sum+s.amount, 0);

    // If we have >= $600 payments, include entry
    if (Math.abs(entry.total) >= 600) annual.push(entry);
  }

  //----------------------------------------------------------------
  // VALIDATION:
  // Check any "required" reporting categories to see if there are payees that you forgot to list
  const all_settings_names = settings.people
    .reduce((acc, p) => ([...acc, p.name, ...p.othernames]), ([] as string[]))
    .filter(uniqueFilter);

  const required_categories = settings.categories.filter(c => c.alwaysReport);
  const missing_people_from_required_categories: Ten99Result['missing_people_from_required_categories'] = {};
  for  (const rc of required_categories) {
    const clines = tlines.filter(l => l.category.match(categoryRegExp(rc.name)))
    const payees_for_this_category = clines
      .map(l => l.who)
      .filter(uniqueFilter);

    // Filter the list of payees from the 1099 to include only those whose name
    // is not found in the settings
    const missing = payees_for_this_category.filter(p => !all_settings_names.find(a => fuzzyCleanup(a) === fuzzyCleanup(p)));
    const missing_over_600bucks: string[] = [];
    // One more test: if that person made less than $600 from us, then they are legit to not be in the list:
    for (const m of missing) {
      const persontotal = clines
        .filter(l => l.who === m) // limit the category lines to only this missing person
        .reduce((sum,l) => (sum + l.amount), 0); // sum up all the amounts

      if (Math.abs(persontotal) < 600) {
        continue;
      }
      missing_over_600bucks.push(m);
    }
    if (missing_over_600bucks.length > 0) {
      missing_people_from_required_categories[rc.name] = missing;
    }

  }

  return {
    ten99: annual,
    missing_people_from_required_categories,
  };
};


function fuzzyCleanup(str: string): string {
  return (str || '')
    .toUpperCase()
    // Get rid of commas, spaces, periods
    .replace(/[ ,\.]/g,'')
    .replace(/LLC/,'')
    .replace(/INC/,'');
}

function categoryRegExp(searchname: string) {
  return new RegExp(`^${searchname}-?`); // loan-interest, loan-interest-...
}
