import xlsx from 'xlsx-js-style'; //'sheetjs-style';
import moment from 'moment';
const { isMoment } = moment;
// Have to jump through some hoops to get TS and node both happy w/ moment-range:
// A handy function to wrap:
const enc = (r, c) => xlsx.utils.encode_cell({ c, r });
// Convert objects into human-readable strings for settings:
const objToStr = (obj) => Object.entries(obj)
    .map(([key, val]) => `${key}: ${val}`)
    .join('; ');
export function accountToWorkbook(acct) {
    const numFmt = '$#,##0.00;[Red]($#,##0.00)';
    const dateFmt = 'yyyy-mm-dd';
    const styles = {
        reg: { numFmt },
        regDate: { numFmt: dateFmt },
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
    const wb = { SheetNames: [], Sheets: {} };
    // Construct the workbook by writing a header row and then putting all the tx info
    const name = acct.name || 'Account';
    wb.SheetNames.push(name);
    const ws = wb.Sheets[name] = {};
    //----------------------------------------------------------
    // Build the header rows:
    let row = 0;
    const headerindex = {};
    for (const tx of acct.lines) {
        for (const key of Object.keys(tx)) {
            headerindex[key] = true;
        }
    }
    const header = Object.keys(headerindex);
    for (const [col, v] of header.entries()) {
        ws[enc(row, col)] = { v, s: { font: { bold: true } } };
    }
    row++;
    if (acct.settings) {
        // Include the account settings:
        ws[enc(row, 0)] = { v: 'SETTINGS' };
        ws[enc(row, 1)] = { v: objToStr(acct.settings) };
        row++;
    }
    const formatDate = (date) => {
        let v = isMoment(date) ? date.format('YYYY-MM-DD') + 'T12:00:00' : ''; // Have to set a time of noon or day is off by one (UTC)?
        let t = 'd';
        let s = styles.regDate;
        if (typeof date === 'string' && date.match(/COMMENT/) || !v.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T12:00:00$/)) {
            v = date?.toString() || '';
            t = 's';
            s = styles.reg;
        }
        return { v, t, s };
    };
    for (const tx of acct.lines) {
        for (const [col, key] of header.entries()) {
            let v = tx[key] || '';
            let s = styles.reg;
            const isnum = (typeof tx[key] === 'number') || (typeof tx[key] === 'string' && !isNaN(+(tx[key])));
            let t = isnum ? 'n' : 's';
            switch (key) {
                case 'date':
                    ({ v, t, s } = formatDate(tx.date)); // have to have outer parens for destructuring into existing variables
                    break;
                case 'postDate':
                    ({ v, t, s } = formatDate(tx.postDate)); // have to have outer parens for destructuring into existing variables
                    break;
                case 'writtenDate':
                    ({ v, t, s } = formatDate(tx.writtenDate)); // have to have outer parens for destructuring into existing variables
                    break;
                case 'acct':
                    v = tx.acct.name;
                    t = 's';
                    break;
                case 'note':
                    if (typeof tx.note === 'object')
                        v = objToStr(tx.note);
                    t = 's';
                    break;
                // numbers that should not be formatted as currency:
                case 'lineno':
                case 'checkNum':
                case 'description':
                case 'who':
                case 'category':
                    t = 's';
                    break;
            }
            ws[enc(row, col)] = { v, t, s };
        }
        row++;
    }
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
}
;
//# sourceMappingURL=exporter.js.map