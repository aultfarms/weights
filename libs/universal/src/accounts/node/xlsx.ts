// Convert the RollingAccountHistory sheets for both bank accounts 
// from XLSX to JSON for easy handling

import fs from 'fs';
import xlsx from 'xlsx';
import chalk from 'chalk';
import numeral from 'numeral';
import debug from 'debug';
import err from '../err';
import settingsParser from '../settings-parser';

const info = debug('af/accounts#reader:info');

const { green, cyan, yellow } = chalk;

import type { RawSheetAccount } from '../reader';

// Read the workbook:
export default async function(
  { status=null }:
  { status?: ((msg: string) => any) | null }
): Promise<RawSheetAccount[]> {
  if (!process.env.ACCOUNTSDIR) {
    throw err('You need to set environment variable ACCOUNTSDIR to point at the directory containing your account xlsx files.');
  }
  const stat: (msg: string)=>any = status ? status : info;

  // Get all files whos names start w/ Account
  const path = process.env.ACCOUNTSDIR;
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
      accts.push({
        filename,
        name: s.name,
        // If you don't put raw: false, it will parse the dates as ints instead of the date string
        lines: xlsx.utils.sheet_to_json(s.sheet, { raw: false } ),
      });
    }
  }
  return accts;
}

