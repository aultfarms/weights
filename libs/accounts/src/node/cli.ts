import { ledger } from '../index.js';
import { readAccountsFromDir } from './spreadsheets.js';
import { Command } from 'commander';

import debug from 'debug';

const program = new Command();
const info = debug('af/accounts#cli:info');
const error = debug('af/accounts#cli:error');


program
  .name('accounts-cli')
  .description('Ault Farms CLI for interacting with accounts');

program.command('ledger')
  .description('Print an account ledger')
  .argument('<account_name>', 'name of account to print')
  .requiredOption('-a, --accountsdir <dirpath>', 'Directory where to load accounts')
  .requiredOption('-t, --type <mkt|tax>', 'Account type to use: mkt or tax')
  .option('-v, --verbose', 'Include status output during parsing')
  .action(async (acctname: string, options) => {
    let status = options.verbose ? info : () => {};
    const rawaccts = await readAccountsFromDir({ status, accountsdir: options.accountsdir });
    const accts = await ledger.loadAll({ rawaccts, status });
    if (!accts) {
      error('Ledger.loadAll returned null');
      return;
    }
    const type = options.type as 'mkt' | 'tax';
    if (options.type !== 'mkt' && options.type !== 'tax') {
      error(`Type ${type} is not mkt or tax`);
      return;
    }
    let acct = accts[type].accts.find(a => a.name === acctname);
    if (!acct) {
      // Try with prefix of "type" because a lot of accounts get mkt.original_name, tax.original_name
      acct = accts[type].accts.find(a => a.name === `${type}.${acctname}`);
      if (!acct) {
        error(`Could not find ${acctname} in accounts of type ${type} as either name ${acctname} or name ${type}.${acctname}.  Account names are: \n${accts[type].accts.map(a => a.name).join('\n')}`);
        return;
      }
    }
    console.log(ledger.ledger2Str(acct));
  });



program.parse();
