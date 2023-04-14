import xlsx, { type WorkBook } from 'xlsx-js-style'; //'sheetjs-style';
import type { Annual1099 } from './index.js';

// A handy function to wrap:
const enc = (r: number,c: number) => xlsx.utils.encode_cell({c,r});

export function ten99ToWorkbook(annual1099: Annual1099): WorkBook {
  const wb: WorkBook = {
    SheetNames: [ '1099-summary', 'AllPeopleTransactions', ],
    Sheets: {
      '1099-summary': {},
      'AllPeopleTransactions': {},
    },
  };
  const wss = wb.Sheets['1099-summary']!;
  const wst = wb.Sheets['AllPeopleTransactions']!;
  
  //--------------------------------------------
  // Transactions sheet:
  // Header:
  wst[enc(0,0)] = { v: 'name'};
  wst[enc(0,1)] = { v: 'address'};
  wst[enc(0,2)] = { v: 'taxid'};
  wst[enc(0,3)] = { v: 'date'};
  wst[enc(0,4)] = { v: 'category'};
  wst[enc(0,5)] = { v: 'amount'};
  // Data:
  let row = 1;
  for (const entry of annual1099) {
    wst[enc(row,0)] = { v: entry.person.name };
    wst[enc(row,1)] = { v: entry.person.address.replace('\n', '\r\n') };
    wst[enc(row,2)] = { v: entry.person.taxid };
    row++;
    for (const l of entry.lines) {
      wst[enc(row,3)] = { v: l.date.format('YYYY-MM-DD'), t: 'd' };
      wst[enc(row,4)] = { v: l.category };
      wst[enc(row,5)] = { v: l.amount, t: 'n' };
      row++;
    };
  };
  wst['!ref'] = xlsx.utils.encode_range({
    s: { c: 0, r: 0},
    e: { c: 5, r: row},
  });


  //------------------------------------------------
  // Summary sheet:
  // Header:
  wss[enc(0,0)] = { v: 'name'};
  wss[enc(0,1)] = { v: 'address'};
  wss[enc(0,2)] = { v: 'taxid'};
  wss[enc(0,3)] = { v: 'category'};
  wss[enc(0,4)] = { v: 'amount'};
  // Data:
  row = 1;
  for (const entry of annual1099) {
    wss[enc(row,0)] = { v: entry.person.name };
    wss[enc(row,1)] = { v: entry.person.address };
    wss[enc(row,2)] = { v: entry.person.taxid };
    wss[enc(row,3)] = { v: 'total' };
    wss[enc(row,4)] = { v: entry.total, t: 'n', };
    row++;
    for (const c of entry.categories) {
      wss[enc(row,3)] = { v: c.name };
      wss[enc(row,4)] = { v: c.amount, t: 'n'};
      row++;
    };
  };
  wss['!ref'] = xlsx.utils.encode_range({
    s: { c: 0, r: 0},
    e: { c: 4, r: row},
  });


  return wb;
};



