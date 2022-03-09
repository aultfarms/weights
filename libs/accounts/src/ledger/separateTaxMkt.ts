import type { Account, AccountTx, FinalAccounts, StatusFunction } from './types.js';
import moment from 'moment';
import { LineError } from '../err.js';
import debug from 'debug';
import rfdc from 'rfdc';


const deepclone = rfdc({ proto: true });
const info = debug('af/accounts#separateTaxMkt:info');
//const trace = debug('af/accounts#separateTaxMkt:trace');


// We have asset/inventory accounts and cash accounts.  
// Let's return (tax, mkt) tx lines (for P&L) and balances (for balance sheets)

function combineAndSortLines(accts: Account[], status: StatusFunction) {
  accts = deepclone(accts);

  status('combineAndSortLines: starting');
  // Combine lines together:
  let lines: AccountTx[] = accts.reduce((acc,acct) => 
    ([ ...acc, ...acct.lines ]), [] as AccountTx[]
  );
  status('combineAndSortLines: reduced lines together, now sorting');

  // Sort by date
  lines.sort((a,b) => {
    if (!a.date || typeof a.date.diff !== 'function') {
      throw new LineError({ line: a, msg: `When sorting lines, line had an empty or invalid date` });
    }
    return a.date.diff(b.date);
  });
  status('combineAndSortLines: lines sorted, recomputing balances');

  // Decided to leave all start lines, but turn them into amounts so balance is right.
  // HOWEVER, when computing a P&L, you HAVE to remember to NOT include isStart lines!!
  lines = lines.map(l => {
    if (l.isStart) l.amount = l.balance;
    return l;
  });
  // Make a new start w/ zero balance 1 day before current oldest:
  const newstart: AccountTx = {
    date: lines[0]?.date.subtract(1, 'day') || moment('1970-01-01', 'YYYY-MM-DD'),
    description: 'Synthetic start for aggregate account',
    amount: 0,
    balance: 0,
    category: 'START',
    isStart: true,
    lineno: -1,
    acct: {
      name: 'SYNTHETIC_START',
      filename: 'none',
      settings: { accounttype: 'cash' },
    },
  };
  lines = [ newstart, ...lines ];


  // Recompute balances: this is why we have to deepclone above
  for (let i=0; i < lines.length; i++) {
    const prev = i===0 ? 0 : lines[i-1]?.balance || 0;
    lines[i]!.balance = prev + lines[i]!.amount;
  };

  return lines;
}


export default function(
  { accts, status }
: { accts: Account[], status?: StatusFunction }
): FinalAccounts {
  if (!status) status = info;
  // All asset/inventory type accounts have taxonly or mktonly set on them.  Cash accounts go in both tax and mkt.
  const taxaccts = accts.filter(a => 
    a.settings.taxonly || 
    (!a.settings.mktonly && 
       (a.settings.accounttype === 'cash' || a.settings.accounttype === 'futures-cash')
    )
  );
  const mktaccts = accts.filter(a => 
    a.settings.mktonly || 
    (!a.settings.taxonly && 
       (a.settings.accounttype === 'cash' || a.settings.accounttype === 'futures-cash')
    )
  );

  status('running combineAndSortLines');
  const taxlines = combineAndSortLines(taxaccts, status);
  status('running combineAndSortLines the second time');
  const mktlines = combineAndSortLines(mktaccts, status);

  status('Returning tax and mkt accounts');

  return {
    tax: {
      lines: taxlines,
      accts: taxaccts,
    },
    mkt: {
      lines: mktlines,
      accts: mktaccts,
    },
  };

}
