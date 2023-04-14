import xlsx from 'xlsx-js-style'; //'sheetjs-style';
import * as google from '@aultfarms/google';
import debug from 'debug';
import chalk from 'chalk';
import oerror from '@overleaf/o-error';
import { MultiError } from '../err.js';
import pLimit from 'p-limit';
//import rfdc from 'rfdc';

//const deepclone = rfdc({ proto: true });

const { red } = chalk;
const info = debug('af/accounts#browser/google:info');

import type { FinalAccounts, Account, AccountTx, RawSheetAccount, StatusFunction, LivestockInventoryAccountTx } from '../ledger/types.js';
import { reloadSomeAccounts } from '../ledger/index.js';
import { importSettings, type Ten99Settings } from '../ten99/index.js';
import type {MissingTxResult} from '../inventory/index.js';
import {stringify} from '../ledger/settings-parser.js';

export async function readAccountsFromGoogle(
  { status=null, accountsdir}:
  { status?: StatusFunction | null, accountsdir: string }
): Promise<RawSheetAccount[]> {
  if (!status) status = info;
  const path = accountsdir;
  let lsfiles = null;
  try {
    lsfiles = await google.drive.ls({ path });
  } catch(e: any) {
    throw oerror.tag(e, `af/accounts#browser/google: failed to ls path ${path}`);
  }
  if (!lsfiles) throw new MultiError({ msg: `Failed to ls files at path ${path}` });
  const accountfiles = lsfiles.contents.filter(f => f.name.match(/^Account-/) && f.kind === 'drive#file');
  // When I switched this to just export the whole sheet as an XLSX, I think I no longer need to worry about this
  //const xlsxfiles = accountfiles.filter(f => f.name.match(/\.xlsx$/)); // I don't think this is 
  //const gsheetsfiles = accountfiles.filter(f => !f.name.match(/\.xlsx$/));
  //for (const x of xlsxfiles) {
  //  status(red('WARNING: reading excel files ('+x.name+') from google is not yet supported.  Open it and save as a google sheet to use it.'));
  //}
  const limit = pLimit(5);
  const accts: RawSheetAccount[] = [];
  const queue = accountfiles.map((fileinfo, fileindex) => limit(async () => {
    const filename = fileinfo.name;
    const id = fileinfo.id;
    status!(`Reading file ${fileindex+1} of ${accountfiles.length}: ` + chalk.green(filename));

    const result = await google.sheets.spreadsheetToJson({ id, filename });
    if (!result) {
      status!(red('WARNING: failed to download and convert spreadsheet file'+filename));
      return;
    }

    for (const [worksheetName, worksheet] of Object.entries(result)) {
      if (!worksheet || !Array.isArray(worksheet.data)) {
        status!(red('WARNING: spreadsheetToJson returned null for sheet name ', worksheetName, ' of file ', filename));
        return;
      }
      accts.push({
        name: worksheetName,
        filename: fileinfo.name,
        id: fileinfo.id,
        header: worksheet.header,
        lines: worksheet.data,
      });
    }
  }));
  await Promise.all(queue);
  return accts;
}

export async function reloadSomeAccountsFromGoogle(
  { status=null, accts, finalaccts }:
  { status?: StatusFunction | null,
    accts: Account[],
    finalaccts: FinalAccounts,
  }
): Promise<FinalAccounts | null> {
  const limit = pLimit(5);

  // In order to limit requests to Google, look through all the accts scheduled for reload
  // and find all the unique id's.  Since many sheets live in one spreadsheet.
  const toload: { [id: string]: { id: string, filename: string, sheetnames: string[] } } = {};
  for (const a of accts) {
    if (!toload[a.id]) toload[a.id] = { id: a.id, filename: a.filename, sheetnames: [] };
    toload[a.id]!.sheetnames.push(a.name);
  }

  let newaccts: RawSheetAccount[] = [];
  const queue = Object.values(toload).map(loadinfo => limit(async () => {
    const { filename, id, sheetnames } = loadinfo;
    const sheets = await google.sheets.spreadsheetToJson({ id, filename });
    if (!sheets) throw new MultiError({ msg: 'Failed to load sheets from google for filename '+filename });

    for (const [sheetname, sheet] of Object.entries(sheets)) {
      if (!sheet) throw new MultiError({ msg: 'Sheet '+sheetname+' was null from spreadsheetToJson' });
      if (sheetnames.find(s => s === sheetname)) {
        newaccts.push({ 
          id, 
          filename,
          name: sheetname,
          header: sheet.header, 
          lines: sheet.data,
        });
      }
    }
  }));
  await Promise.all(queue);
  return reloadSomeAccounts({ rawaccts: newaccts, finalaccts, status });
}

export async function read1099SettingsFromGoogle(
  { status=null, settingsdir}:
  { status?: StatusFunction | null, settingsdir: string }
): Promise<Ten99Settings> {
  if (!status) status = info;
  const path = settingsdir;
  let lsfiles = null;
  try {
    lsfiles = await google.drive.ls({ path });
  } catch(e: any) {
    throw oerror.tag(e, `af/accounts#browser/google: failed to ls path ${path}`);
  }
  if (!lsfiles) throw new MultiError({ msg: `Failed to ls files at path ${path}` });
  const settingsfile = lsfiles.contents.filter(f => f.name.match(/^1099Settings/) && f.kind === 'drive#file')[0];
  if (!settingsfile) {
    throw new MultiError({ msg: `Failed to find 1099Settings file at path ${path}` });
  }
  const filename = settingsfile.name;
  const id = settingsfile.id;
  const result = await google.sheets.spreadsheetToJson({ id, filename });
  if (!result) {
    throw new MultiError({ msg: `WARNING: spreadsheetToJson or getFileContents returned null for file: ${filename}` });
  }

  const rawpeople = result['people']?.data;
  const rawcategories = result['categories']?.data;
  if (!rawpeople) {
    throw new MultiError({ msg: `1099Settings did not have a 'people' sheet` });
  }
  if (!rawcategories) {
    throw new MultiError({ msg: `1099Settings did not have a 'categories' sheet` });
  }
  return importSettings({ rawpeople, rawcategories });
}


const xlsxMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function uploadXlsxWorkbookToGoogle(
  { parentpath, parentid, filename, workbook }:
  { parentpath?: string, parentid?: string, filename: string, workbook: xlsx.WorkBook }
): Promise<{ id: string}> {
  if (!parentid) {
    // Ensure the path exists first:
    if (!parentpath) throw new MultiError({ msg: 'uploadXlsxWorkbookToGoogle: have neither parentpath nor parentid'});
    const dir = await google.drive.ensurePath({ path: parentpath });
    if (!dir) throw new MultiError({ msg: `Failed to ensurePath ${parentpath}` });
    parentid = dir.id;
  }
  // Upload the file
  const file = await google.drive.uploadArrayBuffer({
    filename,
    parentid,
    type: xlsxMimeType,
    buffer: xlsx.write(workbook, { bookType: 'xlsx', type: 'array' }),
  });
  if (!file) throw new MultiError({ msg: `Failed to upload file to google` });
  return { id: file.id };
}

// Just a wrapper to get from acct/lines to params for google
export async function batchUpsertTx({ acct, lines, insertOrUpdate }: { acct: Account, lines: AccountTx[], insertOrUpdate: 'INSERT' | 'UPDATE' }) {
  // Fixup the notes back into decent-looking strings before putting back into Google
  const newlines = lines.map(l => {
    if (!l.note || typeof l.note !== 'object') return l;
    return {
      ...l,
      note: stringify(l.note),
    };
  });

  return google.sheets.batchUpsertRows({  // returns a promise
    id: acct.id,
    worksheetName: acct.name,
    rows: newlines,
    header: acct.header,
    insertOrUpdate
  });
}

export async function pasteBalancesOrTemplate({ acct }: { acct: Account }) {
  if (!acct.lines[0]) throw new MultiError({ msg: 'The account '+acct.name+' does not have at least 1 line in it, so template line and starting line to paste is not defined.' });
  const startLineno = acct.lines[1]?.lineno || (acct.lines[0].lineno+1); // start pasting at first line after start.
  let templateLineno = acct.templateLineno;
  let limitToCols: number[] | null = null;
  if (!templateLineno) { // templateLineno is 1-indexed, so 0 is an invalid lineno
    // The default "template" row is just the first row after start, i.e. lines[1]
    templateLineno = startLineno
  } else { // If there is no temlate line, we'll need to limitCols when we guess which cols to paste based on colname
    limitToCols = [];
    for (const [index, colname] of acct.header.entries()) {
      if (colname.match(/[bB]alance/)) limitToCols.push(index); // this is a "balance" line, so it needs pasted
      if (colname.match(/^[aA]ve/)) limitToCols.push(index); // for livestock, these "ave*" things are also formulas
    }
  }
  const params: Parameters<typeof google.sheets.pasteFormulasFromTemplateRow>[0] = {
    id: acct.id,
    worksheetName: acct.name,
    templateLineno,
    startLineno,
  };
  if (limitToCols) params.limitToCols = limitToCols;

  return google.sheets.pasteFormulasFromTemplateRow(params);
}

// Convenience functions: do the main action, then paste balances back down
export async function insertMissingIvtyTx(missing: MissingTxResult) {
  await batchUpsertTx({ acct: missing.acct, lines: missing.missingInIvty, insertOrUpdate: 'INSERT' });
  await pasteBalancesOrTemplate({ acct: missing.acct });
}

export async function applyLivestockFifoUpdates({ acct, lines }: { acct: Account, lines: LivestockInventoryAccountTx[] }) {
  await batchUpsertTx({ acct, lines, insertOrUpdate: 'UPDATE' });
  await pasteBalancesOrTemplate({ acct });
}
