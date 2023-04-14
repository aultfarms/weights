import chalk from 'chalk';
import debug from 'debug';
import numeral from 'numeral';
import { LineError } from '../err.js';
import type { 
  ValidatedRawSheetAccount,
  ValidatedRawTx,
  StatusFunction,
} from './types.js';

const { green } = chalk;
const info = debug('af/accounts#splits:info');
//const trace = debug('af/accounts#splits:trace');

export default function(
  { accts, status }
: { accts: ValidatedRawSheetAccount[], status: StatusFunction}
) {
  return accts.map(acct => {
    if (!status) status = info;

    if (acct.errors && acct.errors.length > 0) {
      status(`Acct ${acct.name} has errors, skipping`);
      return acct;
    }

    let insplit = false;
    let splitbase: ValidatedRawTx | null = null;
    let splitsum = 0;
    let splitstartcount = 0;
    let splitpartcount = 0;
    const startNewSplit = (line: ValidatedRawTx) => {
      insplit = true;
      splitbase = line;
      splitsum = 0;
    }
    
    const endSplit = () => {
      insplit = false;
      // since these are floating point, cheat and convert them to strings to compare
      const sum = numeral(splitsum).format('$0,0.00');
      const orig = numeral(splitbase?.amount).format('$0,0.00');
      if (sum !== orig) {
        throw new LineError({
          line: splitbase,
          msg: `endSplit: sum of splits ('${sum}') !== original amount ('${orig}')`
        });
      }
    };
    
    const isStartOfSplit = (line: ValidatedRawTx) => line.category === 'SPLIT';
    const isPartOfSplit  = (line: ValidatedRawTx) => line.description === 'SPLIT';
    const isNonSplit     = (line: ValidatedRawTx) => !(isPartOfSplit(line) || isStartOfSplit(line));

    let errors: string[] = [];
    acct.lines = acct.lines.reduce((acc,line) => {
      try {
        // Regular line:
        if (isNonSplit(line)) {
          if (insplit) endSplit();
          acc.push(line);
          return acc;
        }
    
        // Start of a new split:
        if (isStartOfSplit(line)) {
          splitstartcount++;
          if (insplit) endSplit();
          startNewSplit(line);
          return acc;
        }
    
        // Must be part of a previous split:
        if (!isPartOfSplit(line)) {
          throw new LineError({
            line, 
            msg: `line is not regular line or start of new split, but also not part of a split!`
          });
        }
  
        if (!insplit) {
          throw new LineError({
            line, 
            msg: 'line is part of a split, but we are not in a split now!'
          });
        }
    
        // Copy relevant stuff from base into this split line item:
        splitpartcount++;
        // inherit writtenDate from base if not present:
        if (!line.writtenDate || line.writtenDate === 'SPLIT') 
          line.writtenDate = splitbase?.writtenDate;
        if (!line.postDate || line.postDate === '' || line.postDate === 'SPLIT') 
          line.postDate = splitbase?.postDate;
    
        // clean up ambiguous entries
        if (!line.writtenDate || line.writtenDate === '') line.writtenDate = line.postDate;
        if (!line.postDate || line.postDate === '') line.postDate = line.writtenDate;   
    
        // If this line has no who, inherit that from base line
        if (!line.who || line.who === '' || line.who === 'SPLIT') {
          if (splitbase?.who === 'SPLIT') {
            throw new LineError({
              line, 
              msg: 'Line has no "who" field, but splitbase.who = SPLIT'
            });
          }
          line.who = splitbase?.who;
        }
        // add amount from this line to total
        splitsum += line.splitAmount;
      
        // replace thise line's empty amount with split amount:
        line.amount = line.splitAmount;

        // Update the line's balance from this new amount using the line above us in the final output:
        const prev = acc.length > 0 ? acc[acc.length-1] : { balance: 0 };
        if (!prev || typeof prev.balance !== 'number') {
          throw new LineError({line,msg: `Previous line had no numeric balance available`});
        }
        if (typeof line.amount !== 'number') {
          throw new LineError({line, msg: 'Line has no amount during balance computation'});
        }
        line.balance = prev.balance + line.amount;
      
        // NOTE: even though it is simpler to line up against the bank statement when you 
        // use post dates everywhere, this logic messes up the quarterly statement so we'll
        // just use the standard method.  Leaving old logic here for reference:
        //     Decide which date to use for the master date on this entry
        //     if year is same, always use post date to make matching bank
        //     statement simpler.  This is the same as in parseDateFromWrittenOrPost
        //     in standardize.js
        //     (debit: written date, credit: post date.)
        //     Already set writtenDate and postDate from above for inheritance
        line.date = line.postDate;
        if (line.amount < 0) { // debit: i.e. we wrote the check, use date we wrote it
          line.date = line.writtenDate;
        }
    
        // Put a description that reminds us this came from a split:
        line.description = 'FROM SPLIT: ' + splitbase?.description
                         + ' (' + numeral(splitbase?.amount).format('$0,0.00') + ')';
        // add new synthetic split line to output:
        acc.push(line);
      } catch(e: any) {
        e = LineError.wrap(e, line, `Line failed split processing`);
        if (!line.errors) line.errors = [];
        line.errors.push(...e.msgs());
        acc.push(line);
      }
      return acc;
    },[] as ValidatedRawTx[]);

    // If last thing was a split, we have to end it now because there was no
    // non-split line to come after in which we decide the split should have ended.
    if (insplit) {
      try { 
        endSplit();
      } catch(e: any) {
        e = LineError.wrap(e, splitbase);
        errors = [ ...errors, ...e.msgs() ];
      }
    }

    // Promote all line errors to account:
    if (errors.length > 0) {
      acct.errors = [ ...(acct.errors || []), ...errors ];
    }

    if (splitstartcount && status) {
      status(green('------> splits:')+
             `          replaced ${splitstartcount}\tsplit base lines with ${splitpartcount}\tsplit lines in acct ${acct.name}`
      );
    }

    return acct;
  }); 
}



