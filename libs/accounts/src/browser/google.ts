import xlsx from 'xlsx-js-style'; //'sheetjs-style';
import * as google from '@aultfarms/google';
import debug from 'debug';
import chalk from 'chalk';
import oerror from '@overleaf/o-error';
import { MultiError } from '../err.js';
import pLimit from 'p-limit';

const { red, yellow } = chalk;
const info = debug('af/accounts#browser/google:info');

import type { RawSheetAccount, StatusFunction } from '../ledger/types.js';
import { importSettings, Ten99Settings } from '../ten99/index.js';

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
    let result: google.sheets.SpreadsheetJson | null = null;
    if (filename.match(/xlsx$/)) {
      // Download as regular xlsx file and make a workbook
      const arraybuffer = await google.drive.getFileContents({ id });
      const wb = xlsx.read(arraybuffer, { type: 'array' });
      result = wb.SheetNames.reduce((acc,sheetname) => {
        acc[sheetname] = xlsx.utils.sheet_to_json(wb, { raw: false });
        return acc;
      }, {} as google.sheets.SpreadsheetJson);
    } else {
      // Export the sheets file as an xlsx.
      status!(yellow(`Reading file ${fileindex+1} of ${accountfiles.length}: ` + chalk.green(filename)));
      result = await google.sheets.spreadsheetToJson({ id });
    }
    if (!result) {
      status!(red('WARNING: spreadsheetToJson or getFileContents returned null for file ', filename));
      return;
    }

    const sheetnames = Object.keys(result);
    for (const worksheetName of sheetnames) {
      if (!result[worksheetName] || !Array.isArray(result[worksheetName])) {
        status!(red('WARNING: spreadsheetToJson returned null for sheet name ', worksheetName, ' of file ', filename));
        return;
      }
      accts.push({
        name: worksheetName,
        filename: fileinfo.name,
        lines: result[worksheetName] as any[],
      });
    }
  }));
  await Promise.all(queue);
  return accts;
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
  let result: google.sheets.SpreadsheetJson | null = null;
  if (filename.match(/xlsx$/)) {
    // Download as regular xlsx file and make a workbook
    const arraybuffer = await google.drive.getFileContents({ id });
    const wb = xlsx.read(arraybuffer, { type: 'array' });
    result = wb.SheetNames.reduce((acc,sheetname) => {
      acc[sheetname] = xlsx.utils.sheet_to_json(wb, { raw: false });
      return acc;
    }, {} as google.sheets.SpreadsheetJson);
  } else {
    // Export the sheets file as an xlsx.
    status(yellow('Reading:') + chalk.green(filename));
    result = await google.sheets.spreadsheetToJson({ id });
  }
  if (!result) {
    throw new MultiError({ msg: `WARNING: spreadsheetToJson or getFileContents returned null for file: ${filename}` });
  }

  const rawpeople = result['people'];
  const rawcategories = result['categories'];
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
