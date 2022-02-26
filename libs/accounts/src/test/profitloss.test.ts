import type { profitloss, ledger } from '../index.js';
import debug from 'debug';

const info = debug('af/accounts#test/ledger:info');

export default async function run(a: typeof profitloss, accounts: ledger.FinalAccounts) {

  info('testing loading yearProfitLoss');

  const mkt = a.yearProfitLoss({ ledger: accounts, type: 'mkt', year: 2020 });
  const tax = a.yearProfitLoss({ ledger: accounts, type: 'tax', year: 2020 });

  if (!mkt) throw `yearProfitLoss returned falsey for mkt`;
  if (!tax) throw `yearProfitLoss returned falsey for tax`;
  info('passed loading yearProfitLoss');

  info('testing some expected category values from yearProfitLoss');
  const expected = [
    { pl: mkt, category: 'inventory-cattle.mkt', value: 106815 },
    { pl: mkt, category: 'equipment-chopper-2013.newholland.fr9050chopper', value: -20000 },
    { pl: tax, category: 'equipment-chopper-taxonlysplit', value: -31016.19 },
    { pl: mkt, category: 'equipment-loader-2015.jcb.ecoskidsteer', value: -20000 }, // a "sold" asset that still had mkt value
  ];
  for (const expect of expected) {
    const cat = a.getCategory(expect.pl.categories, expect.category);
    if (!cat) 
      throw `yearProfitLoss did not return a ${expect.category} category`;
    if (!a.moneyEquals(a.amount(cat), expect.value)) 
      throw `yearProfitLoss did not return expected amount (${expect.value}) for ${expect.category} (${a.amount(cat)})`;
  }

  info('passed expected values from yearProfitLoss');

}


