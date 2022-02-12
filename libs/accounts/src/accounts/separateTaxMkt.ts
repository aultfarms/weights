import type { Account, AccountTx, FinalAccounts } from './types.js';


// We have asset/inventory accounts and cash accounts.  
// Let's return (tax, mkt) tx lines (for P&L) and balances (for balance sheets)

function combineAndSortLines(accts: Account[]) {
  // Combine lines together:
  let lines: AccountTx[] = accts.reduce((acc,acct) => 
    acc.concat(acct.lines), [] as AccountTx[]
  );

  // Sort by date
  lines = lines.sort((a,b) => {
    return a.date.diff(b.date)
  });

  // Recompute balances
  lines = lines.map((l,i) => {
    const prev = i===0 ? 0 : lines[i-1]?.balance || 0;
    return { ...l, balance: prev + l.amount, };
  });

  return lines;
}


export default function(
  { accts }
: { accts: Account[] }
): FinalAccounts {
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
  const taxlines = combineAndSortLines(taxaccts);
  const mktlines = combineAndSortLines(mktaccts);

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
