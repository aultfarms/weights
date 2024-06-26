import type * as google from '../';
import debug from 'debug';

type Google = typeof google;
const info = debug('test/google#util:info');

export const pathroot = `/AF-AUTOMATEDTESTS/TEST-${+(new Date())}`;
info('Running tests against root path: ', pathroot);

export async function checkUpsertResultAgainstExpected(
  { expected, id, worksheetName, g }:
  { expected: google.sheets.RowObject[], id: string, worksheetName: string, g: Google }
): Promise<void> {
  // Now grab the values from the spreadhseet and compare
  const r6 = await g.sheets.spreadsheetToJson({ id });
  const sheet = r6?.[worksheetName];
  if (!sheet) throw `Could not retrieve spreadsheet after batchInsertRows using spreadsheetToJson`;
  for (let i=0; i < expected.length; i++) {
    const expectedrow = expected[i]!;
    const resultrow = sheet.data[i];
    if (!resultrow) throw `Expected a result at row ${i} but there is nothing at that index in result`;
    for (let j=0; j < Object.keys(expectedrow).length - 1; j++) { // the "-1" is b/c lineno is on the expected object and it doesn't count
      const col = `col${j}`;
      // Check that every proper row/col value matches the original row
      if (!resultrow[col]) throw `Expected a result at row ${i} col ${col} but it is falsey`;
      if (resultrow[col] !== expectedrow[col]) {
        throw `Row ${i} expected col ${col} (${expectedrow[col]}) to equal result (${resultrow[col]}) but it does not`;
      }
    }
  }
}

export function validateRowObject({ result, expected }: {
  result?: Record<string,string | number>,
  expected: Record<string,string | number>
}) {
  if (!result) throw `ERROR: result was falsey`;
  for (const [key, val] of Object.entries(expected)) {
    if (key === 'lineno') continue; // don't expect to have lineno
    let fail = false;
    if (typeof val === 'number') {
      if (Math.abs(val - +(result[key] || 0)) > 0.01) {
        fail = true;
      }
    } else {
      fail = (val !== result[key]);
    }
    if (fail) {
      info('ERROR: result =',result);
      throw `ERROR: expected result[${key}] to have value (${val}) with type ${typeof val}, but it was (${result[key]}) with type ${typeof result[key]} instead`;
    }
  }
}