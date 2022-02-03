import { client } from './core';
import { createFile, ensurePath, idFromPath } from './drive';
import debug from 'debug';

import type { sheets_v4 as Sheets } from '@googleapis/sheets';

const warn = debug('af/google#sheets:warn');
//const info = debug('af/google#sheets:info');
//const trace = debug('af/google#sheets:trace');

async function sheets(): Promise<Sheets.Sheets> {
  // @ts-ignore
  return ((await client()).sheets as Sheets.Sheets);
}

export function arrayToLetterRange(row:string,arr:any[]):string {
  const startletter = 'A';
  const end = arr.length-1;
  let endletter = String.fromCharCode(65+end);
  if (arr.length > 25) { // more than a single letter can represent
    const mostsig = String.fromCharCode(65+Math.trunc(end/26)); // integer division
    const leastsig = String.fromCharCode(65+(end%26)); // remainder
    endletter = mostsig+leastsig;
  }
  return startletter+row+':'+endletter+row;
}

export async function getAllRows(
  { id, worksheetName }
: { id: string, worksheetName: string }
): Promise<Sheets.Schema$ValueRange> {
  const res = await ((await sheets()).spreadsheets.values.get({ 
    spreadsheetId: id, 
    range: worksheetName+'!A:ZZ',
  }));
  // Not sure why result is not on the type
  // @ts-ignore
  return res.result;
}

// cols is just an array of your data, in order by the columns you want to
// put it at.  i.e. cols[0] will go in column A, cols[1] in B, etc. in your chosen row.
export async function putRow(
  {id,row,cols,worksheetName}
: {id: string, row: string, cols: string[], worksheetName: string}
) {
  //const range = worksheetName+'!'+arrayToLetterRange(row,cols);
  const params = {
    spreadsheetId: id,
    range: worksheetName+'!'+arrayToLetterRange(row,cols),
    valueInputOption: 'RAW', //'USER_ENTERED',
    includeValuesInResponse: true,
  };
  const data = {
    range: worksheetName+'!'+arrayToLetterRange(row,cols),
    majorDimension: 'ROWS',
    values: [ cols ],
  };
  const result = await ((await client()).sheets.spreadsheets.values.update(params, data));
  return result.result.updatedData?.values[0];
}

export async function getSpreadsheet(
  {id=null,path=null}:
  {id?: string | null, path?: string | null}
): Promise<Sheets.Schema$Spreadsheet | null> {
  if (!id) {
    if (!path) {
      warn('getSpreadsheet: WARNING: you must pass either an id or a path, and you passed neight as truthy.');
      return null;
    }
    const id = (await idFromPath({path}))?.id;
    if (!id) {
      warn('getSpreadsheet: WARNING: unable to find an ID at given path: ',path);
      return null;
    }
  }
  const res = await ((await sheets()).spreadsheets.get({
    spreadsheetId: id || '',
    ranges: [],
    includeGridData: false,
  }));
  // I don't know why the type of spreadsheets.get doesn't have result on it
  // @ts-ignore
  return res?.result;
}

export async function createSpreadsheet({
  parentid=null,
  parentpath=null,
  name,
  worksheetName=false
// either give a parentid
}: {
  parentid: string | null | false,
  parentpath?:null,
  name: string,
  worksheetName?: string | false,
// or give a parentpath
} | {
  parentid?:null,
  parentpath: string,
  name: string,
  worksheetName?: string
}): Promise<{ id: string } | null > {
  if (!parentid && parentpath) {
    const result = await ensurePath({path: parentpath});
    if (!result) {
      warn('WARNING: google.createSpreadsheet: Unable to ensurePath for parentpath = ', parentpath);
      throw new Error('Unable to ensure path for parentpath '+parentpath);
    }
    parentid = result?.id;
  }
  const fileresult = await createFile({
    parentid,
    name,
    mimeType: 'application/vnd.google-apps.spreadsheet'
  });
  if (!fileresult) return null;

  const id = fileresult.id;
  if (!worksheetName) return {id};
  // If we have a worksheetName, add a worksheet with that name
  await ((await client()).sheets.spreadsheets.batchUpdate(
    { spreadsheetId: id },
    { 
      requests: [ 
        { 
          addSheet: { 
            properties: { 
              title: worksheetName, 
              index: 0 
            } 
          } 
        } 
      ]
    }
  ));
  return {id};
}
