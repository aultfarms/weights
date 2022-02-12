import { 
  ValidatedRawSheetAccount, 
  StatusFunction,
  assertValidatedRawTx,
} from './types.js';
import { MultiError } from './err.js';
import { mapSkipErrors } from './util.js';

// Get rid of non-transaction or non-asset lines (i.e. comments, settings)
// Note that this mutates the account lines and the account
export default function(
  { accts, status }
: { accts: ValidatedRawSheetAccount[], status: StatusFunction }
): void {
  for (const acct of accts) {
    if (acct.errors && acct.errors.length > 0) return; // do not further process accounts w/ errors from previous steps

    const startlinecount = acct.lines.length;
    // Filter to include only those lines that have no values of COMMENT, IGNORE, or SETTINGS
    acct.lines = acct.lines.filter(l => {
      if (l.errors && l.errors.length > 0) return true; // keep errors around to report on
      const values = Object.values(l);
      // If comment, ignore, settings, discard during filter
      if (values.find(v => v === 'COMMENT' || v === 'IGNORE' || v === 'SETTINGS')) {
        return false;
      }
      // If no "truthy" values, discard line (i.e. an empty line)
      if (values.length < 1 || !values.find(v => !!v)) {
        return false;
      }
      
      return true;
    });

    // Convert any remaining string numbers into actual numbers: remove $, turn -- into -, remove commas
    let numconversions = 0;
    for (const l of acct.lines) {
      if (l.errors && l.errors.length > 0) continue; // don't mess w/ error lines
      for (const [k, v] of Object.entries(l)) {
        if (typeof v !== 'string') continue;
        if (k === 'acct') continue;
        if (k === 'stmt') continue;
        if (k === 'note') continue;
        if (k === 'description') continue;
        if (k === 'stmtacct') continue;
        if (k === 'category') continue;
        if (k === 'date') continue;
        if (k === 'writtenDate') continue;
        if (k === 'postDate') continue;
        let str: string = v.trim();
        if (!str.match(/^[\$\-]*[0-9.,]+$/)) continue;
        // Convert to number if it looks like a number
        str = str.replace(/^\$/,'')
          .replace(/^-\$-/, '-') // some things start with -$-
          .replace(/^--/,'-') // some things start with --
          .replace(/,/g, '');
        // Replace the string in the line with the number:
        l[k] = +(str);
        numconversions++;
      }
    }
   
    acct.lines = mapSkipErrors(acct.lines, l => {
      try { 
        assertValidatedRawTx(l);
      } catch(e: any) {
        e = MultiError.wrap(e, `after pruning and numberizing, line ${l.lineno} failed validation`);
        l = {
          acct,
          lineno: l.lineno,
          errors: e.msgs(),
        };
      }
      return l;
    });

    status(`pruneAndNumberize: Account ${acct.name} pruned ${startlinecount - acct.lines.length} lines and converted ${numconversions} number-like strings to numbers`);
  }
}
