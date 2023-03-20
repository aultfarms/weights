import xlsx from 'xlsx-js-style'; //'sheetjs-style';
import moment from 'moment';
import momentrange from 'moment-range';
import { amount, credit, debit } from './categorize.js';
const { extendMoment } = momentrange;
// Have to jump through some hoops to get TS and node both happy w/ moment-range:
const { range } = extendMoment({ ...moment, default: moment });
// A handy function to wrap:
const enc = (r, c) => xlsx.utils.encode_cell({ c, r });
export function profitLossToWorkbook(pl) {
    const { type, timeranges } = pl;
    const numFmt = '$#,##0.00;[Red]($#,##0.00)';
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
    // Construct the workbook by reducing over the included timeranges for the year:
    return timeranges.reduce((wb, rangeinfo) => {
        const { name, categories } = rangeinfo;
        wb.SheetNames.push(name);
        const ws = wb.Sheets[name] = {};
        // Compute the number of days each date range represents (earliest transaction to latest transaction)
        const days = daysDurationFromCategories(categories);
        //----------------------------------------------------------
        // Build the header rows:
        let row = 0;
        ws[enc(row, 0)] = { v: `${name} - ${type.toUpperCase()} P&L`, s: { font: { bold: true } } };
        row += 2;
        // Put number of days above everything:
        ws[enc(row, 0)] = { v: 'Days: ' };
        ws[enc(row, 1)] = { v: days, t: 'n' };
        row++;
        // header names:
        let col = 0;
        const catcols = [col++, col++, col++, col++, col++, col++];
        ws[enc(row, catcols[0])] = { v: 'category-1' };
        ws[enc(row, catcols[1])] = { v: 'category-2' };
        ws[enc(row, catcols[2])] = { v: 'category-3' };
        ws[enc(row, catcols[3])] = { v: 'category-4' };
        ws[enc(row, catcols[4])] = { v: 'category-5' };
        ws[enc(row, catcols[5])] = { v: 'category-6' };
        const amountcol = col++;
        const debitcol = col++;
        const creditcol = col++;
        ws[enc(row, amountcol)] = { v: 'Amount: ' };
        ws[enc(row, debitcol)] = { v: 'Debit: ' };
        ws[enc(row, creditcol)] = { v: 'Credit: ' };
        row++;
        // Set the column widths:
        ws['!cols'] = [];
        let wch = 15;
        for (let i = 0; i < catcols.length; i++) {
            // For level 2 category w/ bigger font, make it a bigger column:
            if (i === 1) {
                ws['!cols'].push({ wch: wch + 10 });
            }
            ws['!cols'].push({ wch });
        }
        wch = 27;
        ws['!cols'][amountcol] = { wch };
        ws['!cols'][debitcol] = { wch };
        ws['!cols'][creditcol] = { wch };
        //-------------------------------------------------------------
        // Fill in the categories in the worksheet
        const catToCurRow = (cat, level) => {
            const s = level === 1 ? styles.imp : styles.reg;
            let amt = amount(cat);
            let cdt = credit(cat);
            let dbt = debit(cat);
            if (isNaN(amt) || Math.abs(amt) < 0.01)
                amt = 0;
            if (isNaN(cdt) || Math.abs(cdt) < 0.01)
                cdt = 0;
            if (isNaN(dbt) || Math.abs(dbt) < 0.01)
                dbt = 0;
            // If this category has no debit or credit, skip it in the output:
            if (dbt === 0 && cdt === 0) {
                return;
            }
            // Only write the styles if it's the "important" level.  Can't figure out 
            // how to get it to leave cells empty so text can extend through them otherwise
            if (level === 1) {
                // have to write the style to all the columns, even the empty ones:
                for (let i = 0; i < catcols.length; i++) {
                    ws[enc(row, catcols[i])] = { v: i === 1 ? cat.name : '', s }; // only set value on the first one (level === 1)
                }
                // Unimportant level, just write the name with no special style in the right column
            }
            else {
                ws[enc(row, catcols[level])] = { v: cat.name };
            }
            //-----------------------------------------------------------
            // Loop through all the date ranges, filter sums by that range
            ws[enc(row, amountcol)] = { v: amt, t: 'n', s },
                ws[enc(row, debitcol)] = { v: dbt, t: 'n', s },
                ws[enc(row, creditcol)] = { v: cdt, t: 'n', s },
                row++;
            if (cat.children) {
                // Recurse for all children at level+1
                for (const childkey of Object.keys(cat.children).sort()) {
                    catToCurRow(cat.children[childkey], level + 1);
                }
            }
        };
        catToCurRow(categories, 0);
        //-------------------------------------------------------------
        // Tell Excel the extent of the rows/cols we're interested in
        const maxcell = Object.keys(ws).reduce((max, key) => {
            const c = xlsx.utils.decode_cell(key); // c.c and c.r are numbers
            if (c.c > max.c)
                max.c = c.c;
            if (c.r > max.r)
                max.r = c.r;
            return max;
        }, { c: 0, r: 0 });
        ws['!ref'] = xlsx.utils.encode_range({
            s: { c: 0, r: 0 },
            e: maxcell
        });
        return wb;
    }, { SheetNames: [], Sheets: {}, });
    //xlsx.writeFile(wb, outfilename);
}
;
function mindate(categories) {
    // Find the min date among the transactions on this element
    let mind = moment(); // today should be the "max" date
    for (const t of categories.transactions) {
        if (t.date.isBefore(mind))
            mind = t.date;
    }
    // Now find the min date among all the children
    for (const c of Object.values(categories.children)) {
        const childmind = mindate(c);
        if (childmind.isBefore(mind))
            mind = childmind;
    }
    return mind;
}
function maxdate(categories) {
    let maxd = moment(0); // Jan 1, 1970
    for (const t of categories.transactions) {
        if (t.date.isAfter(maxd))
            maxd = t.date;
    }
    for (const c of Object.values(categories.children)) {
        const childmaxd = maxdate(c);
        if (childmaxd.isAfter(maxd))
            maxd = childmaxd;
    }
    return maxd;
}
function daysDurationFromCategories(categories) {
    const mind = mindate(categories);
    const maxd = maxdate(categories);
    if (!mind || !maxd)
        return 0;
    return range(mind, maxd).diff('days');
}
//# sourceMappingURL=exporter.js.map