const xlsx = require('xlsx');
const moment = require('moment-range').extendMoment(require('moment'));
const _ = require('lodash');

const outfilename = '../RollingCategorySummary.xlsx';

// A handy function to wrap:
const enc = (r,c) => xlsx.utils.encode_cell({c,r});

// This module returns a function that accepts a year as input and 
module.exports = ranges => {
  const wb = _.reduce(ranges, (wb,rangeinfo) => { // wb stands for 'workbook'
    const {timerange,name,categories} = rangeinfo;
    wb.SheetNames.push(name);
    wb.Sheets[name] = {};
    const ws = wb.Sheets[name];

    // Compute the number of days each date range represents (earliest transaction to latest transaction)
    const days = daysDurationFromTimeRangeAndCategories(timerange, categories);
 
    //----------------------------------------------------------
    // Build the header rows:
    let row=0;
    ws[enc(row,0)] = { v: name };
    row += 2;

    // Put number of days above everything:
    ws[enc(row,0)] = { v: 'Days: ' };
    ws[enc(row,1)] = { v: days, t: 'n' };
    row++;

    // header names:
    let col=0;
    const catcols = [ col++, col++, col++, col++, col++ ];
    ws[enc(row,catcols[0])] = { v: 'category-1' };
    ws[enc(row,catcols[1])] = { v: 'category-2' };
    ws[enc(row,catcols[2])] = { v: 'category-3' };
    ws[enc(row,catcols[3])] = { v: 'category-4' };
    ws[enc(row,catcols[4])] = { v: 'category-5' };
   
    const  amountcol = col++;
    const   debitcol = col++;
    const  creditcol = col++;
    ws[enc(row, amountcol)] = { v: 'Amount: ' };
    ws[enc(row,  debitcol)] = { v:  'Debit: ' };
    ws[enc(row, creditcol)] = { v: 'Credit: ' };
    row++;

    //-------------------------------------------------------------
    // Fill in the categories in the worksheet
    const catToCurRow = (cat,level) => {
      ws[enc(row,catcols[level])] = { v: cat.name };
      //-----------------------------------------------------------
      // Loop through all the date ranges, filter sums by that range
      let amount = cat.amount({});
      let credit = cat.credit({});
      let  debit = cat.debit( {});
      if (isNaN(amount) || Math.abs(amount) < 0.01)  amount = 0;
      if (isNaN(credit) || Math.abs(credit) < 0.01)  credit = 0;
      if (isNaN( debit) || Math.abs( debit) < 0.01)   debit = 0;

      ws[enc(row, amountcol)] = { v:  amount, t: 'n' },
      ws[enc(row,  debitcol)] = { v:   debit, t: 'n' },
      ws[enc(row, creditcol)] = { v:  credit, t: 'n' },
      row++;
      if (cat.children) {
        _.each(_.keys(cat.children).sort(), childkey => catToCurRow(cat.children[childkey],level+1));
      }
    };
    catToCurRow(categories,0);
  
    //-------------------------------------------------------------
    // Tell Excel the extent of the rows/cols we're interested in
    const maxcell = _.reduce(ws, (max,cell,key) => {
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
  },{ SheetNames: [], Sheets: {}, });

  xlsx.writeFile(wb, outfilename);
};


function mindate(categories) {
  let mind = _.reduce(categories.transactions, (min,t) => (!min || (t.date && t.date.isBefore(min)) ? t.date : min),false);
  let childmind = _.reduce(categories.children, (min,c) => {
    const d = mindate(c);
    if (!min || (d && d.isBefore(min))) return d;
    return min;
  },false);
  if (mind && childmind) return (mind.isBefore(childmind) ? mind: childmind);
  if (mind) return mind;
  return childmind;
}

function maxdate(categories) {
  let maxd = _.reduce(categories.transactions, (max,t) => (!max || (t.date && t.date.isAfter(max)) ? t.date : max),false);
  let childmaxd = _.reduce(categories.children, (max,c) => {
    const d = maxdate(c);
    if (!max || (d && d.isAfter(max))) return d;
    return max;
  },false);
  if (maxd && childmaxd) return (maxd.isAfter(childmaxd) ? maxd: childmaxd);
  if (maxd) return maxd;
  return childmaxd;
}


function daysDurationFromTimeRangeAndCategories(timerange, categories) {
  const mind = mindate(categories);
  const maxd = maxdate(categories);
  if (!mind || !maxd) return 0;
  return moment.range(mind,maxd).diff('days');
}


