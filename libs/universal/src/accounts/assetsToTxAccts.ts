import moment, { Moment, isMoment } from 'moment';
import numeral from 'numeral';
import rfdc from 'rfdc'; // really fast deep clone
import omit from 'omit';
import { moneyEquals } from './util';

import type { ValidatedRawSheetAccount, OriginLine, AccountInfo } from './types';

import { MultiError, AccountError, LineError } from './err';

const deepclone = rfdc(); // can pass options if you want to

const AMOUNT_PLACEHOLDER = -9_999_999_999;

type AssetTx = {
  isStart?: boolean,
  originLine: any,
  category: string,
  lineno: number,
  acct: AccountInfo,
  date: Moment,
  description: string,
  // "START" only happens if there isn't a purcase or initial tx
  assetTxType: 'START' | 'PURCHASE' | 'INITIAL' | 'AS-OF' | 'SALE',
  amount: number,
  priorValue?: number,
  expectedPriorValue?: number,
  priorDate?: Moment,
  expectedCurrentValue?: number,
  balance?: number,
};

function weHave(v: any) {
  if (typeof v === 'string') return v !== '';
  return typeof v !== 'undefined';
}
function safesetNumber(n: any): number {
  if (!n) return 0; // handles undefined, 0, ''
  if (typeof n === 'string') return numeral(n)?.value() || 0;
  return n;
}
function lineToStr(l: any) {
  l = deepclone(l); // copy the line object
  l.acct = "<"+l.acct.name+">";
  let originLineStr = `<OriginLine: {`;
  if (weHave(l.originLine?.taxPriorValue)) originLineStr += ` taxPriorValue: ${l.originLine.taxPriorValue} `;
  if (weHave(l.originLine?.mktPriorValue)) originLineStr += ` mktPriorValue: ${l.originLine.mktPriorValue} `;
  if (weHave(l.originLine?.taxCurrentValue)) originLineStr += ` taxCurrentValue: ${l.originLine.taxCurrentValue} `;
  if (weHave(l.originLine?.mktCurrentValue)) originLineStr += ` mktCurrentValue: ${l.originLine.mktCurrentValue} `;
  originLineStr += '}>';
  l.originLine = originLineStr;
  l.date = l.date.format('YYYY-MM-DD');
  return JSON.stringify(l,null,'  ');
}
export function ledger2Str(acct: ValidatedRawSheetAccount) {
  return JSON.stringify(
    // get rid of acct lines and origin.lines
    omit(['lines'])({
      ...acct, 
      origin: omit(['lines'])(acct.origin),
    })
  ) + '\n' + acct.lines.map(lineToStr).join('\n');
}
function pushError(acct: ValidatedRawSheetAccount, err: MultiError | LineError | AccountError) {
  acct.errors = err.concat(acct.errors || [] as string[]);
}

function balanceAtDate(date: Moment, acct: ValidatedRawSheetAccount) {
  let balance = acct.lines[0]?.balance || 0;
  for(const l of acct.lines) {
    if (l.date && isMoment(l.date) && l.date.isAfter(date)) break; // found first one after our target, so balance is whatever we had last
    balance = l.balance || 0;
  }
  return balance;
}


function assetLinesToAccts(accumulator: ValidatedRawSheetAccount[], acct: ValidatedRawSheetAccount): void {

  // 1: if acct has idcolumn (land), append the value in that column to category:
  if (acct.settings.idcolumn) {
    for(const l of acct.lines) {
      l.category += '-'+l[acct.settings.idcolumn];
    }
  }

  // 2: Make an account from each line
  for (const line of acct.lines) {
    if (line.errors && line.errors.length > 0) continue; // no need to look at it

    // Account name is just the category of this asset
    // unless account has accountname override that smooshes all lines into single account
    let name = line.category;
    if (!name || typeof name !== 'string') {
      throw new LineError({ 
        line, acct,
        msg: `ERROR: assets line had no category, so the resulting account name would be undefined`,
      });
    }

    if (acct.settings.acctname) {
      name = acct.settings.acctname;
      if (!line.category) line.category = name; // mainly for futures-asset
    }

    // If line has an "asOfDate", use that first, then use setting on sheet if available
    const asOfDate = line.asOfDate || acct.settings?.asOfDate;
    if (!asOfDate) {
      throw new LineError({
        line,
        msg: `ERROR: neither line nor acct.settings has asOfDate.  Line is: ${JSON.stringify(line,null,'  ')}, Acct.settings is: ${JSON.stringify(acct.settings,null,'  ')}`
      });
    }

    // Decide if this line has tax account info and if it has mkt account info
    let hasTax = false;
    let hasMkt = false;

    if (acct.settings.mktonly) {
      hasTax = false;
      hasMkt = true;
    } else if (acct.settings.taxonly) {
      hasTax = true;
      hasMkt = false;
    } else { // Otherwise, not overriden at the account level, decide from line values
      if (weHave(line.taxAssetid) || weHave(line.taxCost) || weHave(line.taxPriorValue) || weHave(line.taxCurrentValue)) {
        hasTax = true;
      }
      if (weHave(line.purchaseValue) || weHave(line.mktInitialValue) || weHave(line.mktPriorValue) || weHave(line.mktCurrentValue)) {
        hasMkt = true;
      }
    }
    if (!hasTax && !hasMkt) {
      throw new LineError({
        line,
        msg: `ERROR: line had neither tax values nor mkt values!  l = ${JSON.stringify(line,null,'  ')}`
      });
    }

    // Create the asset account as a descendant of the spreadsheet itself
    // And make up to 2 copies: one for tax and one for mkt so there is no overlap between them
    for(const type of [ 'tax', 'mkt' ]) {
      if (type === 'tax' && !hasTax) continue; // nothing to do for this account
      if (type === 'mkt' && !hasMkt) continue; // nothing to do for this account

      const typename = `${type}.${name}`; // tax.name, mkt.name
      // Does accounts list already have either of these account names?  If so, keep its 
      // info and lines instead of what we just made
      let existing = accumulator.find(a => a.name === typename);
      if (!existing) {
        const newone: ValidatedRawSheetAccount = {
          ...deepclone(acct),
          origin: { 
            name: acct.name, 
            filename: acct.filename,
            lines: [],
          },
          settings: {
            ...deepclone(acct.settings),
          },
          [type+'only']: true, // taxonly, mktonly
        };
        // push the new one onto the master list of accounts:
        accumulator.push(newone);
        existing = newone;
      }

      // compute our new line that will become the TX line eventually
      const originLine: OriginLine = {
        ...deepclone(line),
        asOfDate,
        date: moment(asOfDate, 'YYYY-MM-DD'), // use this moment to sort by
      };

      if (!existing.origin) {
        existing.origin = {
          name: 'unknown',
          filename: 'unknown',
          lines: [],
        };
      }
      // Push onto originLines for this account
      existing.origin.lines.push(originLine);
    }
  }
}



export default function(
  { accts }
: { accts: ValidatedRawSheetAccount[] }
): ValidatedRawSheetAccount[] {

  // First pass: make all the accounts with all the origin.lines
  const newaccts: ValidatedRawSheetAccount[] = [];
  for(const acct of accts) {
    if (acct.errors && acct.errors.length > 0) {
      newaccts.push(acct);
      continue; // skip accounts with errors from previous steps
    }
    switch(acct.settings.accounttype) {
      case 'cash':
      case 'futures-cash':
        if (newaccts.find(a => a.name === acct.name)) {
          pushError(acct, new AccountError({ 
            acct, 
            msg: `Account type is 'cash' or 'futures-cash' and therefore shouldn't be merged, but the account name (${acct.name}) already exists`
          }));
          newaccts.push(acct);
          continue;
        }
        newaccts.push(acct);
      break;
      case 'asset':
      case 'inventory':
      case 'futures-asset':
        assetLinesToAccts(newaccts, acct); // appends to newaccts
      break;
      case 'invalid':
        pushError(acct, new AccountError({
          acct,
          msg: `acct ${acct.name} from file ${acct.filename} has an unrecognized accounttype: ${acct.settings.accounttype}.`
        }));
        newaccts.push(acct);
        continue;
    }
  }

  for(const acct of newaccts) {
    if (acct.errors && acct.errors.length > 0) continue; // if the account already has an error, ignore further processing
    switch(acct.settings.accounttype) {
      case 'invalid': continue; // invalid accounts don't get processed
      case 'asset':
      case 'inventory':
      case 'futures-asset':

        //----------------------------------------------------------------------
        // Pass 2: For each account, sort asset origin lines by date (ascending) so 
        // we have consistent ordering for balance computations.  Note Moment's sort as numbers.
        if (!acct.origin) {
          pushError(acct, new AccountError({
            acct,
            msg: 'ERROR: have no origin information on an asset, inventory, or futures-asset account. acct is '+acct.name
          }));
          continue;
        }
        if (acct.origin.lines) {
          acct.origin.lines = acct.origin.lines.sort((a: OriginLine,b: OriginLine) => +(b.date) - +(a.date));
        }

        //------------------------------------------------------------------
        // SPECIAL:For futures-asset account only, group all the individual things for each month (i.e. that have the same asOfDate) 
        // into a single net mktCurrentValue and taxCurrentValue entry, and force the category to just "futures-asset" 
        function unique(value: any, index: number, self: any[]) {
          return self.indexOf(value) === index;
        }
        if (acct.settings.accounttype === 'futures-asset') {
          // Grab all the known as-of dates (strings) and sort them ascending (oldest first)
          const unique_asofdates = acct.origin.lines.map(l=>l.asOfDate).filter(unique).sort();
          // Now put the origin lines in as of those dates:
          acct.origin.lines = unique_asofdates.map(d => {
            const lines_w_date: OriginLine[] = acct.origin?.lines.filter(l => l.asOfDate === d) || [];
            const cumulative_line: OriginLine = omit([
              // Remove the stuff that doesn't make sense anymore:
              'qty', 'txtype', 'trademonth', 'commodity', 'strike', 
              'unitsPerContract', 'initialValuePerUnit', 'currentValuePerUnit' 
            ])({
              ...deepclone(lines_w_date[0]), // keep all the extraneous stuff from initial line
              description: `Cumulative entry for ${lines_w_date.length} entries in futures-asset account for asOfDate of ${d}`,
              // Then replace specific entries with cumulative totals:
              mktCurrentValue:   lines_w_date.reduce((sum,l) => sum + l.mktCurrentValue, 0),
              mktInitialValue:   lines_w_date.reduce((sum,l) => sum + l.mktInitialValue, 0),
              mktNetValueChange: lines_w_date.reduce((sum,l) => sum + l.mktNetValueChange, 0), 
            }) as OriginLine;
            // Now return just this one line for this date (which map will then put in this slot for the main array of lines)
            return cumulative_line;
          });
        }

        
        //---------------------------------------------------------------
        // Pass 3: Make the TX lines.
        // Turn each line in asset accounts into separate tx's for asOfDate, initialDate(inventory), purchaseDate(asset), and saleDate (asset)
        // Each line has date, description, amount, category, note, acct, originLine, assetTxType
        const accountinfo: AccountInfo = {
          ...omit('lines')(acct),
          origin: omit('lines')(acct.origin),
        };
        acct.lines = acct.origin.lines.reduce((acc,l) => {
          if (l.errors && l.errors.length > 0) {
            throw new LineError({line: l, msg: `Tried to make transactions from an error origin line` });
          }
          const lines_to_push = [];
          if (!acct.settings.mktonly && !acct.settings.taxonly) {
            throw new LineError({
              line: l,
              msg: `ERROR: asset acct ${acct.name} has neither mktonly nor taxonly setting, but that should have been figured out automatically`
            });
          }

          const linetemplate = {
            originLine: deepclone(l),
            category: l.category,
            lineno: l.lineno,
            acct: accountinfo,
          };
          // A Purchase goes in as a mid-year TX for both taxes and mkt.
          // Both use purchaseDate, but taxes use taxCost and mkt uses purchaseValue
          // inventory accounts call it initialDate and mktInitialValue, but they mean same thing as purchaseDate and purchaseValue
          if (l.purchaseDate || l.initialDate) { // assets
            const value = acct.settings.taxonly ? l.taxCost : (l.purchaseValue || l.mktInitialValue);
            // If we have a date but we do not have a value, then don't insert a purchase. (old things we don't remember).
            // If we DO have a value, then go ahead and use that
            if (weHave(value)) {
              const date = l.purchaseDate || l.initialDate; // default purchaseDate, fallback initialDate
              const newline: AssetTx = {
                ...deepclone(linetemplate),
                date: moment(date, 'YYYY-MM-DD'),
                description: l.purchaseDate ? "Asset Purchase" : "Asset initial addition to inventory",
                assetTxType: l.purchaseDate ? 'PURCHASE' : 'INITIAL',
                amount: safesetNumber(acct.settings.taxonly ? l.taxCost : (l.purchaseValue || l.mktInitialValue)), // inventory accounts use l.mktInitialValue instead of purchaseValue
                expectedPriorValue: 0, // on a purchase, we are expecting to start from 0
                priorDate: moment(date, 'YYYY-MM-DD').subtract(1, 'days'), // day before purchase, we should be zero
              };
              lines_to_push.push(newline);

              // Now, if we just pushed a purchase, but the priorDate for the originLine is AFTER the purchase,
              // then we have an entry that was purchased before we started so we have no history
              // to fixup the expectedPriorValue.  Add another entry to fix that if needed:
              const priorDate = moment(l.priorDate || acct.settings.priorDate, 'YYYY-MM-DD');
              if (newline.date.isBefore(priorDate)) {
                const newline: AssetTx = {
                  ...deepclone(linetemplate),
                  date: deepclone(priorDate),
                  description: "Initializing prior balance value after old purchase",
                  assetTxType: 'AS-OF',
                  amount: -99999999,
                  // Force "current" value to be expected "prior" value (i.e. the next TX will be the as-of TX that will check prior value)
                  expectedCurrentValue: safesetNumber(acct.settings.taxonly ? l.taxPriorValue : l.mktPriorValue),
                };
                lines_to_push.push(newline);
              }
            }
          }
          
          // An asOfDate TX should compute the amount based on the specified balance
          if (l.asOfDate) { // all asset/inventory types, including futures-asset
            const priorValue = acct.settings.taxonly ? l.taxPriorValue : l.mktPriorValue;
            const newline: AssetTx = {
              ...deepclone(linetemplate),
              date: moment(l.asOfDate, 'YYYY-MM-DD'),
              description: "asOfDate Balance Adjustment." + (l.description ? '  Orig desc: '+l.description : ''),
              assetTxType: 'AS-OF',
              amount: AMOUNT_PLACEHOLDER, // 'AS-OF_COMPUTE_FROM_EXPECTED_BALANCE',
              expectedCurrentValue: safesetNumber(acct.settings.taxonly ? l.taxCurrentValue : l.mktCurrentValue),
              priorValue: safesetNumber(acct.settings.taxonly ? l.taxPriorValue : l.mktPriorValue),
              // These are only used if we have a priorValue:
              expectedPriorValue: safesetNumber(priorValue),
              priorDate: moment(l.priorDate || acct.settings.priorDate, 'YYYY-MM-DD'),
            };
            if (!weHave(priorValue)) {
              delete newline.expectedPriorValue;
              delete newline.priorDate;
            }
            lines_to_push.push(newline);
          }

          // A saleDate TX works just like a purchase TX: amount specified by sale value.  Only applies to mkt.
          // i.e. it is a mid-year transaction to offset an actual trade-in value or check amount
          if (acct.settings.mktonly && l.saleDate && weHave(l.saleValue)) {  // inventory accounts don't use this (only asOfDate updates), only asset accounts use this.
            // Note: you actually cannot say that the expectedCurrentValue is 0 after sale, because we probably
            // didn't have the exact estimated value in there before the sale.  There will be a net balance
            // that is expensed/incomed at the end of the year/period
            const newline: AssetTx = {
              ...deepclone(linetemplate),
              date: moment(l.saleDate, 'YYYY-MM-DD'),
              description: "Asset sold." + (l.description ? "  Orig desc: "+l.description : ''),
              assetTxType: 'SALE',
              amount: safesetNumber(l.saleValue),
            };
            lines_to_push.push(newline);
          }

          if (lines_to_push.length < 1) {
            if (!acct.errors) acct.errors = [] as string[];
            acct.errors.push(`ERROR: had an original asset account line that resulted in no TX lines upon conversion.  Original line is: ${JSON.stringify(l,null,'  ')}`);
          }

          return acc.concat(lines_to_push);
        },[] as AssetTx[]);

        //------------------------------------------------------
        // Next, create START entry, either as zero balance or as prior values if we have them.
        // Note, if the first entry is a purchase, and it's originLine also has a non-zero priorValue,
        // then we not only need 
        const first = acct.lines[0];
        if (!first) {
          throw new AccountError({acct, msg: `Asset account has no lines`});
        }
        if (first.description !== 'START') { // If we don't have start, make one
          // default to priorDate on TX, otherwise priorDate on acct, otherwise just one day before first TX
          const startdate = first.priorDate || 
            acct.settings.priorDate || 
            moment(first.date).subtract(1, 'day').format('YYYY-MM-DD');
          const newfirst: AssetTx = {
            assetTxType: 'START',
            description: 'START',
            originLine: { description: 'Synthetic Start' },
            category: first.category || 'UNKNOWN_ASSET_CATEGORY',
            date: moment(startdate, "YYYY-MM-DD"),
            amount: 0,
            balance: weHave(first.expectedPriorValue) ? first.expectedPriorValue : 0,
            lineno: -1,
            acct: accountinfo,
          }
          acct.lines = [ newfirst, ...acct.lines ];
        }

        //------------------------------------------------------------
        // Finally ready to compute the balances/amounts
        // Pass 4: Compute any missing amounts that are supposed to correct balances to equal the currentValue's
        for (let i=1; i < acct.lines.length; i++) { // skip start entry
          const l = acct.lines[i]!;
          const prev = acct.lines[i-1]!;
          // First make sure we have a properly-computed amount to force balance to currentValue:
          if (l.amount === AMOUNT_PLACEHOLDER && l.assetTxType === 'AS-OF') {
            // this is the tx amount you need to make the balance what is expected
            l.amount = l.expectedCurrentValue - (prev.balance || 0);
          }
          // Now compute the running balance:
          // TS thinks the balance and amount could be undefined...
          l.balance = (prev.balance || 0) + (l.amount || 0);
        }


        //----------------------------------------------------------
        // Error handling/checking: verify that the balances all match what spreadsheets said they should be
        for(const [i, l] of acct.lines.entries()) {
          const prev = i > 0 ? acct.lines[i-1] : false;
          if (typeof l.balance !== 'number') {
            throw new LineError({ line: l, msg: `Line has no balance` });
          }
          if (typeof l.amount !== 'number') {
            throw new LineError({ line: l, msg: `Line has no amount` });
          }
          // Prior value checks
          if (weHave(l.expectedPriorValue)) {
            if (!l.priorDate || !l.priorDate.isValid()) {
              pushError(acct, new LineError({
                line: l,
                msg: `ERROR (checking prior): line ${i} `+
                  `of acct ${acct.name} with txtype ${l.assetTxType} has no `+
                  `priorDate to check prior value.  Should have been in `+
                  `acct.settings.priorDate.  acct.settings is: `+
                  `${JSON.stringify(acct.settings,null,'  ')}, and l.priorDate is `+
                  `${l.priorDate}`, 
              }));
            }
            if (!moneyEquals(balanceAtDate(l.priorDate, acct),l.expectedPriorValue)) {
              pushError(acct, new LineError({
                line: l,
                msg: `ERROR: line ${i} of acct ${acct.name}: `+
                  `balanceAtDate(${l.priorDate.format('YYYY-MM-DD')}, acct) `+ 
                  `[${balanceAtDate(l.priorDate,acct)}] !== expectedPriorValue(${l.expectedPriorValue}), `+
                  `l = ${lineToStr(l)}, prev = ${lineToStr(prev)},  `+
                  `acct = ${ledger2Str(acct)}`,
              }));
            }
          }

          // currentValue checks
          if (weHave(l.expectedCurrentValue)) {
            if (!moneyEquals(l.balance,l.expectedCurrentValue)) {
              pushError(acct, new LineError({
                line: l,
                msg: `ERROR: line ${i} of acct ${acct.name}: `+
                  `l.balance(${l.balance}) !== expectedCurrentValue(${l.expectedCurrentValue}). `+
                  `l = ${lineToStr(l)}`,
              }));
            }
          }

          // NaN amount and balance checks:
          if (isNaN(l.amount)) {
            pushError(acct, new LineError({
              line: l,
              msg: `ERROR: line ${i} of acct ${acct.name}: `+
                `l.amount is NaN!`,
            }));
          }
          if (isNaN(l.balance)) {
            pushError(acct, new LineError({
              line: l, 
              msg: `ERROR: line ${i} of acct ${acct.name}: `+
                `l.balance is NaN!`,
            }));
          }
        }
      break;
    }
  }

  return newaccts;  
}
