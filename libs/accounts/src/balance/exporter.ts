import xlsx, { type WorkBook } from 'xlsx-js-style'; //'sheetjs-style';
import type { BalanceSheet, BalanceTree, AnnualBalanceSheet, QuarterBalanceSheet } from './index.js';
import { MultiError } from '../err.js';
import debug from 'debug';

const info = debug('af/accounts#balance/exporter:info');

// Copied from profit-loss and updated for balance sheet

// A handy function to wrap:
const enc = (r: number,c: number) => xlsx.utils.encode_cell({c,r});

export function borrowingBaseToWorkbook(baseQuarters: QuarterBalanceSheet[]) {
  return annualBalanceSheetToWorkbook(baseQuarters, true); // "true" means useQty
}

export function annualBalanceSheetToWorkbook(abs: AnnualBalanceSheet | QuarterBalanceSheet[], useQty?: boolean ) {

  const numFmt = '$#,##0.00;[Red]($#,##0.00)';
  const qtyFmt = '#,##0;[Red](#,##0)';
  const styles = {
    reg: { numFmt },
    imp: { 
      numFmt,
      fill: { fgColor: { rgb: 'FFDBF4DF' } },
      font: {
        bold: true,
        sz: 24,
        color: {
          rgb: 'FF0F6009',
        }
      }
    }
  };
  const qtyStyles = {
    reg: { numFmt: qtyFmt },
    imp: {
      ...styles.imp,
      numFmt: qtyFmt
    }
  };

  let sheets = [];
  if (Array.isArray(abs)) {
    // Borrowing Base (array of quarters of only the accounts which have borrowingBase: true
    sheets = abs
      .sort((a,b) => b.name.localeCompare(a.name)) // reverse alphabetical (latest first)
      .map(a => a.balancesheet); // grab the balance sheets out of each quarter
  } else {
    // Regular balance sheet:
    if (abs.asOfDate) sheets.push(abs.asOfDate);
    if (abs.yearend) sheets.push(abs.yearend);
    if (abs.quarters) {
      // Could have a duplicate with the year-end here
      for (const q of abs.quarters) {
        if (sheets.find(s => s.name === q.name)) continue; // do not push duplicates
        // Otherwise, this is a new one
        sheets.push(q.balancesheet);
      }
    }
  }
  if (sheets.length < 1) {
    throw new MultiError({ msg: `AnnualBalanceSheet had no balance sheets` });
  }


  return sheets.reduce((wb: WorkBook,bs: BalanceSheet) => {
    info(`Adding balance sheet ${bs.name} into workbook`);
    const {date,name,tree,type} = bs;

    wb.SheetNames.push(name);
    wb.Sheets[name] = {};
    const ws = wb.Sheets[name]!;

    //----------------------------------------------------------
    // Build the header rows:
    let row=0;
    ws[enc(row,0)] = { v: `${name} - ${type.toUpperCase()} Balance Sheet`, s: { font: { bold: true } } };
    row += 2;

    ws[enc(row,0)] = { v: `As Of: ` };
    ws[enc(row,1)] = { v: date.format('YYYY-MM-DD'), t: 'd' };
    row++;

    // header names:
    let col=0;
    const catcols = [ col++, col++, col++, col++, col++, col++ ];

    ws[enc(row,catcols[0]!)] = { v: 'category-1' };
    ws[enc(row,catcols[1]!)] = { v: 'category-2' };
    ws[enc(row,catcols[2]!)] = { v: 'category-3' };
    ws[enc(row,catcols[3]!)] = { v: 'category-4' };
    ws[enc(row,catcols[4]!)] = { v: 'category-5' };
    ws[enc(row,catcols[5]!)] = { v: 'category-6' };
   
    const  balancecol = col++;
    ws[enc(row, balancecol)] = { v: 'Balance:' };
    const qtycol = col++;
    const unitscol = col++;
    const avecol = col++;
    const weightcol = col++;
    const aveweightcol = col++;
    const aveweightmoneycol = col++;
    if (useQty) {
      ws[enc(row, qtycol)] = { v: 'Qty:' };
      ws[enc(row, unitscol)] = { v: '' }; // units
      ws[enc(row, avecol)] = { v: '$/Qty:' };
      ws[enc(row, weightcol)] = { v: 'Lbs:' };
      ws[enc(row, aveweightcol)] = { v: 'Lbs/Qty' };
      ws[enc(row, aveweightmoneycol)] = { v: '$/Lb' };
    }
    row++;

    // Set the column widths:
    ws['!cols'] = [];
    let wch = 15;
    for(let i=0; i < catcols.length; i++) {
      // For level 2 category w/ bigger font, make it a bigger column:
      if (i===1) {
        ws['!cols'].push({ wch: wch+10 });
      }
      ws['!cols'].push({ wch });
    }
    wch = 27;
    ws['!cols'][balancecol] = { wch };
    wch = 10;
    if (useQty) {
      ws['!cols'][qtycol] = { wch };
      ws['!cols'][unitscol] = { wch };
      ws['!cols'][avecol] = { wch };
      ws['!cols'][weightcol] = { wch };
      ws['!cols'][aveweightcol] = { wch };
      ws['!cols'][aveweightmoneycol] = { wch };
    }


    //-------------------------------------------------------------
    // Fill in the categories in the worksheet
    const importantlevel = 1;
    function catToCurRow(cat: BalanceTree,level: number) {
      const s = level === importantlevel ? styles.imp : styles.reg;
      const qtyS = level === importantlevel ? qtyStyles.imp : qtyStyles.reg;

      let balance = cat.balance;
      if (isNaN(balance) || Math.abs(balance) < 0.01)  balance = 0;

      let qty = cat.qtyBalance;
      if (isNaN(qty) || Math.abs(qty) < 0.01) qty = 0;

      let weight = cat.weightBalance;
      if (isNaN(weight) || Math.abs(weight) < 0.01) weight = 0;

      // Only write the styles if it's the "important" level.  Can't figure out 
      // how to get it to leave cells empty so text can extend through them otherwise
      if (level === importantlevel) {
        for (let i=0; i < catcols.length; i++) {
          ws[enc(row,catcols[i]!)] = { v: i==1 ? cat.name : '', s };
        }
      } else {
        ws[enc(row,catcols[level]!)] = { v: cat.name };
      }

      ws[enc(row, balancecol)] = { v:  balance, t: 'n', s };
      if (useQty) {
        const isLeafNode = !cat.children || Object.keys(cat.children).length < 1;
        if (isLeafNode) {
          ws[enc(row, qtycol)] = { v:  qty, t: 'n', s: qtyS };
          // Add the "qtyKey" as an indicator of the units on the quantity if we have one
          if (cat.acct?.settings.qtyKey) {
            ws[enc(row, unitscol)] = { v:  cat.acct.settings.qtyKey, s };
          }
          let ave = balance / qty;
          if (isNaN(ave)) ave = 0;
          ws[enc(row, avecol)] = { v:  ave, t: 'n', s };
          if (weight > 0) {
            let aveweight = weight / qty;
            if (isNaN(aveweight)) aveweight = 0;
            let aveweightmoney = balance / weight;
            if (isNaN(aveweightmoney)) aveweightmoney = 0;
            
            ws[enc(row, weightcol)] = { v:  weight, t: 'n', s: qtyS };
            ws[enc(row, aveweightcol)] = { v:  aveweight, t: 'n', s: qtyS };
            ws[enc(row, aveweightmoneycol)] = { v:  aveweightmoney, t: 'n', s };
          }
        }
      }
      row++;
      if (cat.children) {
        const keys = Object.keys(cat.children).sort();
        for (const childkey of keys) {
          catToCurRow(cat.children[childkey]!, level+1);
        }
      }
    };
    catToCurRow(tree,0);
  
    //-------------------------------------------------------------
    // Tell Excel the extent of the rows/cols we're interested in
    const maxcell = Object.keys(ws).reduce((max,key) => {
      const c = xlsx.utils.decode_cell(key); // c.c and c.r are numbers
      if (c.c > max.c) max.c = c.c;
      if (c.r > max.r) max.r = c.r;
      return max;
    },{ c: 0, r: 0 });
    ws['!ref'] = xlsx.utils.encode_range({
      s: { c: 0, r: 0},
      e: maxcell
    });
  
    return wb; 
  }, xlsx.utils.book_new() );

};


