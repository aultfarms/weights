import moment from 'moment';
import momentrange from 'moment-range';
import minimist from 'minimist';
import _ from 'lodash';
import { table } from 'table';
import numeral from 'numeral';

momentrange.extendMoment(moment);
const argv = minimist(process.argv.slice(2));


(async () => {

const chalk = (await import('chalk')).default;
const accounts = await import('@aultfarms/accounts');

const pad = (str, width) => {
  let n = str;
  while (n.length < width) n = ' '+n;
  return n;
}
const padNumber   = (val,width) => pad(numeral(val).format('0,000.00'), width || 12);
const padCurrency = (val,width) => pad(numeral(val).format('$0,000.00'), width || 13);

let general_ledger = null;

const accountsdir = argv.d;
if (!accountsdir) {
  console.log('ERROR: You must specify the path to your local accounts dir with -d <dir>');
  process.exit(1);
}
const startarg = argv.s || argv.start;
if (!startarg) {
  console.log('ERROR: You must at least specify a start date for tallies as YYYY-MM-DD with -s or --start');
  process.exit(1);
}
const start = moment(startarg, 'YYYY-MM-DD');
if (!start.isValid()) {
  console.log('ERROR: could not parse your date, it should be YYYY-MM-DD, but it was this instead: ', startarg);
  process.exit(1);
}
const endarg = argv.e || argv.end || moment().format('YYYY-MM-DD');
const end = moment(endarg, 'YYYY-MM-DD');

console.log('Using start = ', start.format('YYYY-MM-DD'), ', and end = ',end.format('YYYY-MM-DD'));

const hasBushels = t => _.has(t, 'note.bushels') && typeof (_.get(note.bushels)) === 'number';

// Annotate each transaction with cumulative amounts, bushels, etc. up to that point
const accumulate = (transactions, paths) => _.reduce(transactions, (acc,t,i) => {
  // Keep any other cumulatives already there:
  const cumulative = { ...(t.cumulative ? t.cumulative : {}) };
  // For each requested cumulative path, add previous to this one
  _.each(paths, p => {
    const previous = i < 1 ? 0 : _.get(_.last(acc).cumulative, p, 0);
    const current = _.get(t,p,0);
//console.log(`${path}: i = ${i}, previous = ${previous}, current = ${current}, sum = ${previous + current}`);
    _.set(cumulative, p, previous + current);
  });
  acc.push({
    ...t,
    cumulative,
  });
  return acc;
}, []);


//-----------------------------------------------------
// The main event
//-----------------------------------------------------


let haveerror = false;
accounts.spreadsheets.readAccountsFromDir({ accountsdir })
.then(rawaccts => accounts.ledger.loadAll({ rawaccts }))
.then(all_transactions => {
  general_ledger = all_transactions;

  // Get a filtered set of transactions for this timerange
  const timerange = moment.range(start, end);

  // Filter by date range:
  let results = _.chain(general_ledger.mkt.lines)

  .tap(ts => console.log('Before date filter, have ',ts.length,' entries'))

  .filter(t => !t.isStart && t.date && t.date.isValid() && timerange.contains(t.date))

  .tap(ts => console.log('After date filter, have ',ts.length,' entries'))

  // Filter by category (sales-grain)
  .filter(t => t.category?.match(/^sales-grain/))

  .tap(ts => console.log('After sales-grain category filter, have ',ts.length,' entries'))

  // Group the transactions by the unique categories (sales-grain-corn, sales-grain-beans, etc.)
  .reduce((acc,t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  },{})
  .tap(ts => {
    console.log('After category combiner, have these categories and # transactions for each: ');
    console.log(table(_.keys(ts).map(k => [ k, ts[k].length ])));
  })

  // for each of those crops, sum the amounts, compute in-order cumulative amounts
  .mapValues(transactions => ({
    transactions: accumulate(transactions, ['amount', 'note.bushels']),
    category: transactions[0].category,

  // Check for any entries without bushels and record them as errors:
  }))

  .mapValues(crop => ({
    ...crop,
    errors: _.filter(crop.transactions, !hasBushels),

  // For each category, print errors and then print transactions with accumulators
  }))

  .each(crop => {
    console.log(chalk.cyan('-----------------------------------------'));
    console.log(chalk.green(crop.category+': '));
    console.log(chalk.yellow('-----------------------------------------'));
    if (crop.errors.length > 0) {
      haveerror = true;
      console.log(chalk.red('FAIL: The following transactions for crop '), crop.category, chalk.red(' are mising bushel entries: '));
      console.log(crop.errors);
    }
    console.log(chalk.yellow('**************'));
    console.log(chalk.yellow('Here are the transactions and accumulators for crop '),crop.category);
    const output = [
      [ 'date', 'amount', 'cum amount', 'who', 'category', 'bu', 'cum bu', '$/bu', '$/cum bu' ],
      ...(_.map(crop.transactions, t => ([ 
        t.date.format('YYYY-MM-DD'),
        padCurrency(t.amount),
        padCurrency(t.cumulative.amount),
        t.who,
        t.category,
        padNumber(t.note?.bushels),
        padNumber(t.cumulative.note.bushels),
        padCurrency(t.amount / t.note.bushels, 6),
        padCurrency(t.cumulative.amount / t.cumulative.note.bushels, 6),
      ])))
    ];
    console.log(table(output, { singleLine: true }));
  }).value();


  if (haveerror) {
    console.log(chalk.red('ERROR: There are errors above, go look at them before you trust the numbers'));
  }
})

})();
