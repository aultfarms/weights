// Convert the RollingAccountHistory sheets for both bank accounts 
// from XLSX to JSON for easy handling

import fs from 'fs';
import xlsx from 'xlsx-js-style'; //'sheetjs-style';
import chalk from 'chalk';
import debug from 'debug';
import { profitLossToWorkbook, type ProfitLoss } from '../profit-loss/index.js';
import { annualBalanceSheetToWorkbook, type AnnualBalanceSheet } from '../balance/index.js';
import { accountToWorkbook, type Account, type CompositeAccount } from '../ledger/index.js';
import { MultiError } from '../err.js';
import moment from 'moment';

const info = debug('af/accounts#reader:info');

const { green, yellow } = chalk;

import type { RawSheetAccount } from '../ledger/types.js';

// Read the workbook:
export async function readAccountsFromDir(
  { status=null, accountsdir=null }:
  { status?: ((msg: string) => any) | null, accountsdir: string | null }
): Promise<RawSheetAccount[]> {
  if (!accountsdir) {
    if (!process.env.ACCOUNTSDIR) {
      throw new MultiError({ 
        msg: 'You need to either pass accountsdir or set environment variable ACCOUNTSDIR to point at the directory containing your account xlsx files.'
      });
    }
    accountsdir = process.env.ACCOUNTSDIR;
  }
  const stat: (msg: string)=>any = status ? status : info;

  // Get all files whos names start w/ Account-
  const path = accountsdir;
  const accountfiles = fs
    .readdirSync(path)
    .filter(f => f.match(/^Account-/))
    .map(filename => ({ path, filename }));

  const accts = [];
  for(const fileinfo of accountfiles) {
    const { path, filename } = fileinfo;
    stat(green('------> reader:'));
    stat(yellow(' reading XLSX file ' + filename))

    const workbook = xlsx.readFile(`${path}/${filename}`);
    let sheets = workbook.SheetNames.map(s => ({ name: s, sheet: workbook.Sheets[s] }));
    for(const s of sheets) {
      stat(yellow('     found account: ' + green(s.name)));

      //-------------------------------------------
      // Extract the initial account info from the sheet (name, lines, settings)
      // acct = { filename, name, lines, settings }
      if (!s.sheet) throw new Error('Somehow we have a sheet those sheet property is falsey');
      const header = headerFromXlsxSheet({ sheet: s.sheet });
      accts.push({
        filename,
        name: s.name,
        id: filename,
        header,
        // If you don't put raw: false, it will parse the dates as ints instead of the date string
        lines: xlsx.utils.sheet_to_json(s.sheet, { raw: false } ),
      });
    }
  }
  return accts;
}

export function profitLossToFile(
  { pl, dirpath, filename }:
  { pl: ProfitLoss, dirpath: string, filename?: string }
): void {
  filename = filename || `${pl.year}_${pl.type}_ProfitLoss.xlsx`;
  const path = `${dirpath}/${filename}`;
  xlsx.writeFile(profitLossToWorkbook(pl),path);
}

export function annualBalanceSheetToFile(
  { abs, dirpath, filename }:
  { abs: AnnualBalanceSheet, dirpath: string, filename: string }
): void {
  filename = filename || `${abs.year}_${abs.type}_BalanceSheet.xlsx`;
  const path = `${dirpath}/${filename}`;
  xlsx.writeFile(annualBalanceSheetToWorkbook(abs),path);
}

export function accountToFile(
  { acct, dirpath, filename }:
  { acct: Account | CompositeAccount, dirpath: string, filename: string }
): void {
  filename = filename || `${moment().format('YYYY-MM-DD-')}_Account_${(acct as Account).name || 'CompositeAccounts'}`;
  const path = `${dirpath}/${filename}`;
  xlsx.writeFile(accountToWorkbook(acct),path);
}

// NOTE: this function is repeated in google/src/sheets.ts because I don't have a great
// place to put shared XLSX utilities at the moment.
export function headerFromXlsxSheet({ sheet }: { sheet: xlsx.WorkSheet }): string[] {
  const range = xlsx.utils.decode_range(sheet['!ref']!);
  const r = range.s.r; // start of range, row number
  const header: string[] = [];
  for (let c=range.s.c; c < range.e.c; c++) {
    const cellref = xlsx.utils.encode_cell({c,r});
    header.push(sheet[cellref]?.w || '');
  }
  return header;
}
