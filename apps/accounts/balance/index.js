const getAccounts = require('../lib');
const Promise = require('bluebird');
const categorize = require('../lib/categorize');
const moment = require('moment-range').extendMoment(require('moment'));
const _ = require('lodash');
const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const numeral = require('numeral');
const clitable = require('cli-table');
const exporter = require('./exporter');
const usage = require('./usage');

const looksLikeYear = y => y.toString().match(/^[0-9]{4}$/);
const looksLikeDate = d => d.match(/^[0-9]{4}-[01][0-9]-[0-3][0-9]$/);

// is a before or on date b
const dateBeforeOrOn = (a,b) => {
  // If they are the same day, consider it a match:
  if (a.format('YYYY-MM-DD') === b.format('YYYY-MM-DD')) return true;
  return a.isBefore(b); // Otherwise, moment's isBefore is fine
}

const printTxTable = lines => {
  const table = new clitable({ head: [ 'date', 'amount', 'balance', 'description', 'who', 'category' ] });
  _.each(lines, l => table.push([ 
    l.date.format('YYYY-MM-DD'), 
    numeral(l.amount).format('$0,0.00'),
    numeral(l.balance).format('$0,0.00'),
    l.description || '',
    l.who || '',
    l.category || '',
  ]));
  console.log(table.toString());
};



//----------------------------------------------------------------------
// Begin:

let printacct = false;
if (argv.a) {
  printacct = argv.a;
}

let dates = [];
if (argv.y) {
  if (!looksLikeYear(argv.y)) usage(`-y ${argv.y} does not look like a year`);
  dates = [ 
    { date: `${argv.y}-12-31`, sheetname: `${argv.y}Q4` },
    { date: `${argv.y}-09-30`, sheetname: `${argv.y}Q3` },
    { date: `${argv.y}-06-30`, sheetname: `${argv.y}Q2` },
    { date: `${argv.y}-03-31`, sheetname: `${argv.y}Q1` },
  ]
}
if (argv.d) {
  if (dates.length > 1) usage(`You cannot mix -d with -y`);
  if (!looksLikeDate(argv.d)) usage(`-d ${argv.d} does not look like a date YYYY-MM-DD`);
  dates = [ { date: argv.d, sheetname: `As Of ${argv.d}` } ];
}
if (dates.length < 1) {
  dates = [ { date: moment().format('YYYY-MM-DD'), sheetname: 'As Of Now' } ];
}
// Add moment date to each one:
dates = _.map(dates, d => ({
  ...d,
  d: moment(d.date+' 23:59:59', 'YYYY-MM-DD HH:mm:ss'),
}))


const balanceForAccountOnDate = (d, acct) => {
  // Walk account until the next day is past the day we want:
  for (let i=0; i<acct.lines.length; i++) {
    // First line date not before or on same day as our search date
    if (!dateBeforeOrOn(acct.lines[i].date, d)) {
      if (i===0) return 0; // If as-of date is before the first entry in this account, the balance is zero:
      return acct.lines[i-1].balance;
    }
  }
  //console.warn('WARNING: date ',d.format('YYYY-MM-DD'), ' is after last entry in account ', acct.name, ' at ', acct.lines[acct.lines.length-1].date.format('YYYY-MM-DD'));
  return acct.lines[acct.lines.length-1].balance;
}

(async () => {
  // tax.accts, mkt.accts
  const { tax, mkt } = await getAccounts();

  if (printacct) {
    const taxacct = _.find(tax.accts, t => t.name === printacct);
    const mktacct = _.find(mkt.accts, m => m.name === printacct);
    if (!taxacct && !mktacct) {
      console.log(`ERROR: requested acct ${printacct} does not exist in list of tax or mkt accounts.`);
      console.log('The tax accounts are: ', _.map(tax.accts, 'name'));
      console.log('The mkt accounts are: ', _.map(mkt.accts, 'name'));
      process.exit(1);
    }

    if (taxacct) {
      console.log(chalk.green('------------------------------------------------------------------------------------'));
      console.log(chalk.cyan(`Transactions for account ${printacct}, as of date ${dates[0].d.format('YYYY-MM-DD')},  `)+chalk.yellow('TAX version:'));
      printTxTable(_.filter(taxacct.lines, l => dateBeforeOrOn(l.date, dates[0].d)));
    }
    if (mktacct > 0) {
      console.log(chalk.green('------------------------------------------------------------------------------------'));
      console.log(chalk.cyan(`Transactions for account ${printacct}, as of date ${dates[0].d.format('YYYY-MM-DD')},  `)+chalk.yellow('MKT version:'));
      printTxTable(_.filter(mktacct.lines, l => dateBeforeOrOn(l.date, dates[0].d)));
    }
    console.log('Done printing transactions and balance for account ', printacct);
    return;
  }

  // Otherwise, get the tree of balances and make the spreadsheet

  // Get all the balances for each date:
  const asOfDateBalances =  _.map(dates, d => ({
    date: d,
    tax: _.map(tax.accts, acct => ({ acct, dateinfo: d, balance: balanceForAccountOnDate(d.d, acct) })),
    mkt: _.map(mkt.accts, acct => ({ acct, dateinfo: d, balance: balanceForAccountOnDate(d.d, acct) })),
  }));


  const updateBalanceInfoFromChildren = tree => {
    // First, make sure child balances are correct:
    if (tree.children) {
      _.each(_.values(tree.children), updateBalanceInfoFromChildren);
    }
    // Next, add my current balance to the balance of all my children
    if (!tree.balanceinfo) tree.balanceinfo = {};
    if (!tree.balanceinfo.balance) tree.balanceinfo.balance = 0;
    tree.balanceinfo.balance += _.reduce(tree.children, (acc,c) => acc + c.balanceinfo.balance, 0);
    return tree;
  }

  // accts is an array, reduce it into a tree
  const treeFromAcctBalances = accts => {
    const tree = _.reduce(accts, (acc,balanceinfo) => {
      // accts.acct, accts.balance, accts.date
      const parts = _.split(balanceinfo.acct.name, '-');
      let cur = acc;
      for(let i=0; i<parts.length; i++) {
        const p = parts[i];
        // Find our place in the tree, creating paths as we go if necessary
        if (!cur.children) cur.children = {};
        if (!cur.children[p]) cur.children[p] = { name: p };
        cur = cur.children[p];
      }
      // cur now points to the last level, if it is not empty then a previous account had this exact name
      if (cur.balanceinfo) {
        throw new Error(`ERROR: there is more than one account with the name ${balanceinfo.acct.name}`);
      }
      cur.balanceinfo = balanceinfo;
      return acc;
    }, { name: 'root' });
    // Now go add up all the balances under the children
    return updateBalanceInfoFromChildren(tree);
  }


  // Flip the model now so the tax/mkt is top level w/ dates inside each
  const spreadsheets = {
    tax: [],
    mkt: [],
  };
  _.each(asOfDateBalances, b => {
    _.each([ 'tax', 'mkt' ], type => {
      // One worksheet for each date for each type of balance sheet:
      spreadsheets[type].push({
        date: b.date,
        tree: treeFromAcctBalances(b[type]),
      });
    });
  });

  //const printTree = (tree,name,level) => {
  //  if (!level) level = 0;
  //  let indent = '';
  //  for(i=0; i<level; i++) indent  += '  ';
  //  console.log(`${indent}${name}: ${tree.balanceinfo.balance}`);
  //  _.each(tree.children, (c,k) => printTree(c,k,level+1));
  //};
  //console.log('And the tree is: '); printTree(spreadsheets.tax[0].tree,'root');
  await Promise.each(_.keys(spreadsheets), async type => {
    await exporter({type, sheets: spreadsheets[type], force: argv.force });
  });

})();

