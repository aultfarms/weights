import * as google from '@aultfarms/google';
import debug from 'debug';
import chalk from 'chalk';
import xlsx from 'sheetjs-style';
import { MultiError } from '../err.js';

const { green, red, yellow } = chalk;
const info = debug('af/accounts#browser/google:info');

import type { RawSheetAccount, StatusFunction } from '../ledger/types.js';

export async function readAccountsFromGoogle(
  { status=null, accountsdir}:
  { status?: StatusFunction | null, accountsdir: string }
): Promise<RawSheetAccount[]> {
  if (!status) status = info;
  const path = accountsdir;
  const lsfiles = await google.drive.ls({ path });
  if (!lsfiles) throw new MultiError({ msg: `Failed to ls files at path ${path}` });
  const accountfiles = lsfiles.contents.filter(f => f.name.match(/^Account-/) && f.kind === 'drive#file');
  const xlsxfiles = accountfiles.filter(f => f.name.match(/\.xlsx$/));
  const gsheetsfiles = accountfiles.filter(f => !f.name.match(/\.xlsx$/));
  for (const x of xlsxfiles) {
    status(red('WARNING: reading excel files ('+x.name+') from google is not yet supported.  Open it and save as a google sheet to use it.'));
  }
  const accts: RawSheetAccount[] = [];
  for (const fileinfo of gsheetsfiles) {
    const filename = fileinfo.name;
    const id = fileinfo.id;
    status(green('------> reader:'));
    status(yellow(' reading Sheets file ' + filename + ' at id ' + id))
    const result = await google.sheets.spreadsheetToJson({ id });
    if (!result) {
      status(red('WARNING: spreadsheetToJson returned null for file ', fileinfo.name));
      continue;
    }
    const sheetnames = Object.keys(result);
    for (const worksheetName of sheetnames) {
      if (!result[worksheetName] || !Array.isArray(result[worksheetName])) {
        status(red('WARNING: spreadsheetToJson returned null for sheet name ', worksheetName, ' of file ', fileinfo.name));
        continue;
      }
      accts.push({
        name: worksheetName,
        filename: fileinfo.name,
        lines: result[worksheetName] as any[],
      });
    }
  }
  return accts;

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
