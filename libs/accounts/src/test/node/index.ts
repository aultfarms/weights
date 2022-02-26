import * as node_accounts from '../../node/index.js';
import path from "path"
import sheetjs from 'xlsx';
import { fileURLToPath } from "url"
import debug from 'debug';
import chalk from 'chalk';
import accountTests from '../accounts.test.js';
const { cyan, red } = chalk;

// xlsx is node-only
const { xlsx, ...universal_accounts } = node_accounts;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const info = debug('af/accounts#test-node:info');

(async function() {

  try { 
    info('testing node xlsx.readAccountsFromDir to read all example_xlsx sheets');
    // Import the test sheets:
    const testsheets = await xlsx.readAccountsFromDir({
      status: () => {}, // silent status
      accountsdir: `${__dirname}/../../../src/test/example_xlsx`,
    });
    info('passed node xlsx.readAccountsFromDir reading all example sheets');
    info(`Node account tests: have ${cyan(testsheets.length)} accounts loaded from example_xlsx`);

    info(`testing univeral account tests`);
    await accountTests(universal_accounts, testsheets);
    info(`passed universal tests`);

    info(`testing node profit loss to file`);
    const ledger = await universal_accounts.ledger.loadAll({ rawaccts: testsheets, status: () => {} });
    if (!ledger) throw `Failed to load ledger for testing profit loss`;
    for (const type of [ 'mkt', 'tax' ]) {
      // @ts-ignore
      const pl = universal_accounts.profitloss.yearProfitLoss({ ledger, type, year: 2020 });
      const dirpath = `/tmp`;
      const filename = `TEST-2020-${type}-PROFITLOSS.xlsx`;
      xlsx.profitLossToFile({pl, dirpath, filename});
      const result = sheetjs.readFile(`${dirpath}/${filename}`);
      if (!result) throw `Output spreadsheet ${dirpath}/${filename} did not exist after xlsx.profitLossToFile`;
      info(`created file ${dirpath}/${filename}`);
    }
    info(`passed node profit loss to file`);

  } catch(e) {
    info(red('FAILED: tests threw exception: '), e);
  }

})();
