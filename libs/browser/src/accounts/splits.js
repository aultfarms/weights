const _ = require('lodash');
const err = require('./err');
const chalk = require('chalk');
const numeral = require('numeral');

function splitErr(line,msg) {
  return err(line, 'splits: '+msg);
}

module.exports = input => {
  acct = _.cloneDeep(input);
  splitstartcount = 0;
  splitpartcount = 0;

  acct.lines = _.reduce(input.lines, (acc,line) => {
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
      if (!isPartOfSplit(line))
        throw splitErr(line, 'line is not regular line or start of new split, but also not part of a split!');
  
      if (!insplit)
        throw splitErr(line, 'line is part of a split, but we are not in a split now!');
    
      // Copy relevant stuff from base into this split line item:
      splitpartcount++;
      // inherit writtenDate from base if not present:
      if (!line.writtenDate || line.writtenDate === '' || line.writtenDate === 'SPLIT') 
        line.writtenDate = splitbase.writtenDate;
      if (!line.postDate || line.postDate === '' || line.postDate === 'SPLIT') 
        line.postDate = splitbase.postDate;
    
      // clean up ambiguous entries
      if (!line.writtenDate || line.writtenDate === '') line.writtenDate = line.postDate;
      if (!line.postDate || line.postDate === '') line.postDate = line.writtenDate;   
  
      // If this line has no who, inherit that from base line
      if (!line.who || line.who === '' || line.who === 'SPLIT') {
        if (splitbase.who === 'SPLIT') throw splitErr(line, 'line has no "who" field, but splitbase.who = SPLIT');
        line.who = splitbase.who;
      }
      // add amount from this line to total
      splitsum += line.splitAmount;
    
      // replace thise line's empty amount with split amount:
      line.amount = line.splitAmount;

      // Update the line's balance from this new amount using the line above us in the final output:
      const prev = acc.length > 0 ? acc[acc.length-1] : { balance: 0 };
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
      line.description = 'FROM SPLIT: ' + splitbase.description
                       + ' (' + numeral(splitbase.amount).format('$0,0.00') + ')';
      // add new synthetic split line to output:
      acc.push(line);
    } catch(e) {
      acc.push({
        is_error: true,
        error: e,
        msg: e.toString(),
        ...line,
      });
    }
    return acc;
  },[]);

  if (splitstartcount) {
    console.log(
      chalk.green('------> splits:')+
      chalk.yellow(`          replaced ${splitstartcount}\tsplit base lines with ${splitpartcount}\tsplit lines in acct ${acct.name}`)
    );
  }
  
  return acct;
}


let insplit = false;
let splitbase = null;
let splitsum = 0;
let splitstartcount = 0;
let splitpartcount = 0;
const startNewSplit = line => {
  insplit = true;
  splitbase = line;
  splitsum = 0;
}

const endSplit = () => {
  insplit = false;
  // since these are floating point, cheat and convert them to strings to compare
  const sum = numeral(splitsum).format('$0,0.00');
  const orig = numeral(splitbase.amount).format('$0,0.00');
  if (sum !== orig) {
    console.log(`Error in split: sum of splits (${sum}) !== original base amount (${orig})`);
    throw splitErr(splitbase,'endSplit: sum of splits ('+sum+') !== original amount ('+orig+')');
  }
};


const isStartOfSplit = line => line.category === 'SPLIT';
const isPartOfSplit  = line => line.description === 'SPLIT';
const isNonSplit     = line => !(isPartOfSplit(line) || isStartOfSplit(line));
