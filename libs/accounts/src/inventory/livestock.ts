import { MultiError, LineError, AccountError } from '../err.js';
import { assertPriceWeightPoints } from '../ledger/types.js';
import type { PriceWeightPoint, LivestockInventoryAccount, LivestockInventoryAccountTx } from '../ledger/types.js';
import type { Moment } from 'moment';
import moment from 'moment';
import { moneyEquals, integerEquals } from '../ledger/util.js';
import debug from 'debug';
import { compareDays, isAfterDay, isBeforeDay, isSameDay, isSameDayOrAfter, isSameDayOrBefore} from '../util.js';
import * as trello from '@aultfarms/trello';
import { records as livestockRecords } from '@aultfarms/livestock';
import numeral from 'numeral';
//import rfdc from 'rfdc';

//const deepclone = rfdc({ proto: true });

//const trace = debug('af/accounts#inventory/fifo:trace');
const info = debug('af/accounts#inventory/fifo:info');

type Group = {
  date: Moment,
  weight: number, // lbs
  amount: number, // $$
  qty: number, // head
  incomingAmountPerHead: number, // compute on incoming
  incomingWeightPerHead: number, // compute on incoming
};

type CurrentInventory = Group[]; // sorted with "fattest" on top (i.e. in position 0)


type DeadRecord = {
  date: Moment,
  qty: number
};

type DeadStarterTx = LivestockInventoryAccountTx & {
  date: Moment,
  description: 'DEAD',
  category: 'cattle-dead',
  qty: number,
  amount: 0,
};


type DailyGainStarterTx = LivestockInventoryAccountTx & {
  date: Moment,
  description: 'DAILYGAIN',
  category: 'inventory-cattle-dailygain',
  qty: 0,
  taxAmount: 0,
};

export async function computeMissingLivestockTx(
  { acct, today }: 
  { acct: LivestockInventoryAccount, today?: Moment }
): Promise<LivestockInventoryAccountTx[]> {
  const deads = await computeDailyDeadsFromTrello({ acct });
  const missingDead = computeMissingDeadTx({ acct, deads });
  const missingDailyGain = computeMissingDailyGains({ acct, today });

  if (missingDead.length < 1 && missingDailyGain.length < 1) {
    return [];
  }

  // Figure out lineno's for dead and dailygains
  // dailygain should always be at the end of the day, so dead
  // goes first, then dailygain.  So, for dead, just find the
  // first row with dead date or later, and set that lineno
  // as the lineno for the dead one.  i.e. a line will be inserted
  // such that dead will be at that lineno in the future, and the
  // other line will be pushed down one.
  let mergedMissing: LivestockInventoryAccountTx[] = [];
  for (const md of missingDead) {
    const acctline = acct.lines.find(l => isSameDayOrAfter(l.date, md.date));
    let lineno = acctline?.lineno;
    if (typeof lineno !== 'number') { // this goes after the last line in the account
      lineno = acct.lines[acct.lines.length-1]!.lineno + 1;
    }
    mergedMissing.push({ ...md, lineno });
  }

  // For daily gain, find the first line whose date is strictly after the dailygain
  // line's date (which gets us to the end of any day that already has lines),
  // and put it at the lineno of that first line after the day.  
  for (const mdg of missingDailyGain) {
    const acctline = acct.lines.find(l => isAfterDay(l.date, mdg.date));
    let lineno = acctline?.lineno;
    if (typeof lineno !== 'number') { // goes after last line in the account
      lineno = acct.lines[acct.lines.length-1]!.lineno + 1;
    }
    mergedMissing.push({ ...mdg, lineno });
  }

  // I'm leaving it up to the generic inventory to re-sort all the missing lines
  // (purchase, sale, dead, dailygain) based on lineno, date, and dailygain (dailygain at end)

  return mergedMissing;
}




//-----------------------------------------------------------------
// DailyGains:
//-----------------------------------------------------------------

export function computeMissingDailyGains({ acct, today }: { acct: LivestockInventoryAccount, today?: Moment }): DailyGainStarterTx[] {
  const missing: DailyGainStarterTx[] = [];
  if (acct.lines.length < 1) {
    throw new AccountError({ acct, msg: 'Account is empty, cannot determine start date for daily gains' });
  }
  if (!today) today = moment();
  let startDay = acct.lines[0]!.date;
  /* This "filter to things after the startYear" scheme
   * didn't work when I put in all the old non-dailygain-based stuff.  Adjusting it to put
   * in all the dailygains and we'll see how it works.
  if (acct.settings.startYear) {
    const startYear = moment(`${acct.settings.startYear}-01-01`, 'YYYY-MM-DD');
    if (isBeforeDay(startDay, startYear)) {
      startDay = startYear;
    }
  }*/
  for (let date = startDay.clone(); isSameDayOrBefore(date, today); date.add(1, 'day')) {
    if (acct.lines.find(l => isSameDay(l.date, date) && l.category === 'inventory-cattle-dailygain')) {
      continue;// this one is already there
    }
    missing.push(createStarterInventoryTxFromDailyGain({ acct, date }));
  }
  return missing;
}

function createStarterInventoryTxFromDailyGain({ acct, date }: { acct: LivestockInventoryAccount, date: Moment }): DailyGainStarterTx {
  return {
    acct: acct.lines[0]!.acct,
    lineno: -1,
    date: date.clone(),
    description: 'DAILYGAIN',
    category: 'inventory-cattle-dailygain',
    amount: 0,
    balance: 0,
    qty: 0,
    qtyBalance: 0,
    weight: 0,
    weightBalance: 0,
    taxAmount: 0,
    taxBalance: 0,
    aveValuePerQty: 0,
    aveValuePerWeight: 0,
    aveWeightPerQty: 0,
    note: ' ', // not sure why this was coming out zero's in test sheet
  };
}



//-----------------------------------------------------------------
// Dead:
//-----------------------------------------------------------------


export async function computeDailyDeadsFromTrello({ acct }: { acct: LivestockInventoryAccount }): Promise<DeadRecord[]> {
  let org = 'Ault Farms';
  if (acct.settings.trelloOrg) {
    org = acct.settings.trelloOrg;
  }
  const client = trello.getClient();
  await client.connect({ org });
  const records = await livestockRecords.fetchRecords(client);
  if (records.dead.errors.length > 0) {
    throw new Error(
      'There are errors on cards in the Dead list in the Livestock board: '
      +records.dead.errors.map(e => `(${e.cardName} -> ${e.error})`).join(', ')
    );
  }
  const dailydeads: { [date: string]: number } = {};
  for (const d of records.dead.records) {
    if (!dailydeads[d.date]) dailydeads[d.date] = 0;
    dailydeads[d.date]! += d.tags.length;
  }

  return Object.entries(dailydeads)
    .map(([date, qty]) => ({ date: moment(date, 'YYYY-MM-DD'), qty }))
    .sort((a,b) => compareDays(a.date, b.date));
}

// This only finds any missing dead transactions in the account.  It does not check the records themselves
// for missing entries.  This allows for "correcting" entries in the account.
export function computeMissingDeadTx({ acct, deads }: { acct: LivestockInventoryAccount, deads: DeadRecord[] }): DeadStarterTx[] {
  const missing: DeadStarterTx[] = [];
  let start = acct.lines[0]!.date;
  if (acct.settings.startYear) {
    const startYear = moment(`${acct.settings.startYear}-01-01`);
    if (isBeforeDay(start, startYear)) {
      start = startYear; // if start year is after the first line's date, use that instead
    }
  }
  for (const dead of deads) {
    if (isBeforeDay(dead.date, start)) continue; // skip anything before the start date
    let deadtx = createStarterInventoryTxFromDead({ acct, dead }); // this inverts the qty so the signs should match
    // Filter to the startYear
    const found = acct.lines.find(l => {
      return isSameDay(l.date, deadtx.date) && l.qty === deadtx.qty
    });
    if (found) continue;
    missing.push(deadtx);
  }
  return missing;
}

function createStarterInventoryTxFromDead({ acct, dead }: { acct: LivestockInventoryAccount, dead: DeadRecord }): DeadStarterTx {
  // weight should be fixed later when fifo runs to check every line's weight balance
  return {
    lineno: -1,
    acct: acct.lines[0]!.acct,
    date: dead.date,
    description: 'DEAD',
    amount: 0, // To be filled in by fifo later as an update once it knows the correct $/hd at the time the animal died
    balance: 0,
    category: 'cattle-dead',
    qty: -dead.qty, // dead cow subtracts from inventory
    qtyBalance: 0,
    weight: 0,
    weightBalance: 0,
    taxAmount: 0,
    taxBalance: 0,
    aveValuePerWeight: 0,
    aveValuePerQty: 0,
    aveWeightPerQty: 0,
  };
}
  

//----------------------------------------------------------------
// FIFO:
//----------------------------------------------------------------

//-------------------------------------------------------------------------------------------------
// NOTE: do not call any of the rest of these functions if there could be lines missing.  
// !!! THIS CAN ONLY BE CALLED ONCE YOU KNOW
// all the in/out transactions are correct/present AND all dailygain lines AND all dead lines are present.
// This will then compute all the correct values for things and send back to you what needs updating.
//-------------------------------------------------------------------------------------------------
export function computeLivestockFifoChangesNeeded(acct: LivestockInventoryAccount): LivestockInventoryAccountTx[]  {
  const expected = computeAmountsTaxAmountsAndWeights(acct);
  if (expected.length !== acct.lines.length) {
    info('FAIL: expected = ', expected);
    throw new MultiError({ msg: `FAIL: computed different number of account lines (${expected.length}) than were present in the account (${acct.lines.length})` });
  }
  const incorrect: LivestockInventoryAccountTx[] = [];
  let start = acct.lines[0]!.date;
  /*
  if (acct.settings.startYear) {
    const startYear = moment(`${acct.settings.startYear}-01-01`, 'YYYY-MM-DD');
    if (isBeforeDay(start, startYear)) {
      start = startYear;
    }
  }*/
  for (const [index, l] of acct.lines.entries()) {
    if (isBeforeDay(l.date, start)) continue; // ignore lines prior to start year
    const exp = expected[index]!;
    const errs = [];
    if (!moneyEquals(l.taxAmount, exp.taxAmount)) {
      errs.push(`moneyEquals returned false: line = ${l.taxAmount}, fifo = ${exp.taxAmount}`);
    }
    if (!integerEquals(l.weight, exp.weight)) {
      errs.push(`integerEquals failed for weight.  line = ${l.weight}, fifo = ${exp.weight}`);
    }
//    if (!moneyEquals(l.taxBalance, exp.taxBalance)) {
//      errs.push(`moneyEquals failed for taxBalance.  line = ${l.taxBalance}, fifo = ${exp.taxBalance}`);
//    }
//    if (!integerEquals(l.weightBalance, exp.weightBalance)) {
//      errs.push(`integerEquals failed for weightBalance.  line = ${l.weightBalance}, fifo = ${exp.weightBalance}`);
//    }
    if (!moneyEquals(l.amount, exp.amount)) {
      errs.push(`moneyEquals failed for amount.  line = ${l.amount}, fifo = ${exp.amount}`);
    }
//    if (!moneyEquals(l.balance, exp.balance)) {
//      errs.push(`moneyEquals failed for balance.  line = ${l.balance}, fifo = ${exp.balance}`);
//    }
    if (!integerEquals(l.qty, exp.qty)) {
      errs.push(`integerEquals failed for qty.  line = ${l.qty}, fifo = ${exp.qty}`);
    }
    if (!integerEquals(l.qtyBalance, exp.qtyBalance)) {
      errs.push(`integerEquals failed for qtyBalance.  line = ${l.qtyBalance}, fifo = ${exp.qtyBalance}`);
    }

    if (errs.length > 0) {
      info('INCORRECT: Comparing acct line',l,' to fifo computed line', exp);
      info('errors = ', errs);
      incorrect.push(roundAmounts(exp));
    }
  }
  return incorrect;
}

function roundAmounts(exp: LivestockInventoryAccountTx) {
  return {
    ...exp,
    amount: +(numeral(exp.amount).format('0.00')),
    taxAmount: +(numeral(exp.taxAmount).format('0.00')),
    weight: +(numeral(exp.weight).format('0.00')),
  };
}

//function roundCents(n: number) { return Math.round(n*100) / 100.0; }
//function roundInt(n: number) { return Math.round(n); }

function computeAmountsTaxAmountsAndWeights(acct: LivestockInventoryAccount): LivestockInventoryAccountTx[] {
  const rog = acct.settings.rog;

  let ivty: CurrentInventory = [];
  const ivtyTaxValue = () => ivty.reduce((sum, group) => group.amount + sum, 0);
  const ivtyHead = () => ivty.reduce((sum, group) => group.qty + sum, 0);
  const ivtyTodayWeight = ({ today }: { today: Moment }) => 
    ivty.reduce((sum, group) => sum + expectedWeight({ today, rog, group }), 0);
  // This acct does not assert as LivestockInventoryAccount unlesss first line has valid note with aveValuePerWeight
  // Keep a running "current" valuePerWeight formula to be updated from the note at any time and kept
  // until another note changes it
  let aveValuePerWeightFormulaPoints = priceWeightPointsFromLine(acct.lines[0]!);
  // mktValue computes using the expected weight
  const ivtyMktValue = ({ today }: { today: Moment }): number => {
    assertPriceWeightPoints(aveValuePerWeightFormulaPoints); // this should always be the case.
    const totalHead = ivtyHead();
    const aveWeight = totalHead ? ivtyTodayWeight({ today }) / totalHead : 0;
    const avePricePerLb = formulaPricePerLb({ formula: aveValuePerWeightFormulaPoints, weight: aveWeight });
    return aveWeight * avePricePerLb * totalHead;
  };

  let prevreturn: LivestockInventoryAccountTx | null = null;
  return acct.lines.map((l: LivestockInventoryAccountTx, index: number) => {

    if (index === 0) { // start line
      // Pre-load any starting balances as an initial synthetic group in inventory from which to remove later
      if (l.qtyBalance) {
        info('Pushing initial FIFO balances as starting group');
        ivty.push({
          date: l.date,
          qty: l.qtyBalance,
          weight: l.weightBalance,
          amount: l.taxBalance,
          incomingAmountPerHead: l.taxBalance / l.qtyBalance, // keep value of first group at Fifo average
          incomingWeightPerHead: l.weightBalance / l.qtyBalance,
        });
      }
      const ret = {
        ...l,
        index,
        taxAmount: 0, 
        weight: 0,
        amount: 0,
        qty: 0,
        lineno: l.lineno,
        category: l.category,
      };
      //info('FIFO: index is 0, returning start line as',ret,'for line', l);
      prevreturn = ret;
      return ret;
    }
    // This should never happen:
    if (!prevreturn) throw new MultiError({ msg: 'Had no previous returned value in FIFO' });
    const today = l.date;
    const yesterday = l.date.clone().subtract(1, 'day');

    // If this line has a new aveValuePerWeight in the note, throw away old one and keep this as the "current"
    const newPriceWeightPoints = priceWeightPointsFromLine(l);
    if (newPriceWeightPoints) {
      aveValuePerWeightFormulaPoints = newPriceWeightPoints;
    }

    // Track these so it's easy to compute the taxAmount, weight, etc. as just current - previous
    const originalBalance = prevreturn.balance;               // These have to come from previous thing we returned, because
    const originalWeightBalance = prevreturn.weightBalance;   // the account lines could be wrong, and we need to have everything match.
    const originalTaxBalance = ivtyTaxValue();                 // Since only purchases and sales will change ivtyTodayWeight({today}),
    const originalQtyBalance = ivtyHead();                     // Then we can't use that are the "original" b/c daily gain lines would then always show zero amounts and weights.
    let weightremoved = 0; // use this to track how much the cows weighed that were removed for a dead line
    //-----------------------------------------------
    // Maintain running FIFO Inventory:
    //-----------------------------------------------
    // Cattle purchase: add to inventory
    if (l.qty > 0) {
      ivty.push({
        date: l.date,
        weight: l.weight,
        amount: l.amount,
        incomingAmountPerHead: l.amount / l.qty, // needed to compute expenses at sale time based on sold # of head
        incomingWeightPerHead: l.weight / l.qty,
        qty: l.qty,
      });

      // b minus a should keep biggest weights on top (index 0), smallest on bottom
      ivty.sort((a: Group, b: Group): number  => {
        const diff = expectedWeightPerHead({today, rog, group: b}) - expectedWeightPerHead({today, rog, group: a})
        return diff;
      });
    }

    // Cattle sale or dead: remove from inventory
    if (l.qty < 0) {
      if (originalQtyBalance < l.qty) {
        throw new LineError({ line: l, acct, msg: `Tried to remove ${l.qty} from inventory, but inventory does not have enough qty (${originalQtyBalance}) for that.` });
      }
      let curqty = Math.abs(l.qty); // Don't forget l.qty is negative!
      while(curqty > 0) {
        const top = ivty[0]!;
        if (!top) {
          throw new MultiError({ msg: `ERROR: tried to remove ${l.qty} from inventory, but there are no groups in inventory to remove from` });
        }
        if (top.qty <= curqty) { // this group does not have enough to handle it, remove this group and move on to the next one
          ivty = ivty.slice(1); // no need to sort, rest are still in proper order
          curqty -= top.qty; // still have reference to top as the thing that got taken out of inventory
          weightremoved += top.qty * expectedWeightPerHead({ today: yesterday, rog, group: top }); // remove 1 day's gain because cattle died/sold before gaining it.
          continue;
        }
        // Otherwise, this entire qty can just come out of the top group
        top.qty -= curqty;
        top.amount = top.qty * top.incomingAmountPerHead;
        top.weight = top.qty * top.incomingWeightPerHead;
        weightremoved += curqty * expectedWeightPerHead({ today: yesterday, rog, group: top }); // remove 1 day's gain because these cattle died/sold before gaining it.
        curqty = 0;                                                                             // This keeps the dailygain for this day as just the final qty * rog
      }
    }

    //----------------------------------------------
    // Compute parameters/metrics of current inventory:
    //----------------------------------------------
    const balance = ivtyMktValue({ today });
    const taxBalance = ivtyTaxValue();
    const weightBalance = ivtyTodayWeight({ today });
    const qtyBalance = ivtyHead();
    const amount = balance - originalBalance; // The balance calculations will all round these numbers in order to compute the balance
    const taxAmount = taxBalance - originalTaxBalance;
    const weight = weightBalance - originalWeightBalance;
    const qty = qtyBalance - originalQtyBalance;
    //info(today.format('YYYY-MM-DD'), ': weightBalance after FIFO:',weightBalance,',  weight:', weight)
    //-------------------------------------------------------------------------
    // Running inventory has now been updated as if this tx line has happened.
    //-------------------------------------------------------------------------

    // Now decide what this line should say given what we know from the line and the current inventory:

    assertPriceWeightPoints(aveValuePerWeightFormulaPoints); // this should always be the case.
    // DAILYGAIN lines should perfectly match inventory in all respects.  They are the "correcting" lines.
    if (l.category === 'inventory-cattle-dailygain') {
      if (taxBalance !== originalTaxBalance) {
        throw new LineError({line: l, acct, msg: 'DailyGain line caused a change in taxBalance.  This is not allowed.' });
      }
      const ret = {
        ...l,
        index,
        weight,
        weightBalance,
        taxAmount: 0, // no tax change allowed on dailygain line
        taxBalance,
        amount,
        balance,
        qty,
        qtyBalance,
      };
      //info('FIFO: dailygain line on lineno',l.lineno,', returning',ret,' for line = ',l);
      prevreturn = ret;
      return ret;
    };

    // DEAD lines expense the cow at it's ave cost/animal at the time it died (for mkt).
    // In the future, you could actually remove the cow from its group.  In the absence of knowing
    // the group, the dead ones should just be removed from inventory at their expected weight today,
    // and then adjust the $ balance according to the new formula for the new ave weight of the remaining animals.
    // What makes this tricky is we don't want to combine the dailygain with the dead line.  In the computations
    // above, the "expectedWeight" is as of today, which includes the dailygain for today.  
    // We will subtract the actual weight that was removed from inventory, lookup the price/lb for that
    // weight, and subtract that $ amount on the market side.  Tax is just fifo.
    // weightremoved is computed above during FIFO inventory subtraction
    if (l.category === 'cattle-dead') {
      let deadaveweight = -weightremoved / qty;
      let deadpriceperlb = formulaPricePerLb({ weight: deadaveweight, formula: aveValuePerWeightFormulaPoints });
      let deadamount = -1 * deadpriceperlb * weightremoved;
      const ret = {
        ...l,
        index,
        weight: -weightremoved, // computed above during FIFO subtraction
        weightBalance: originalWeightBalance - weightremoved, // cannot just use weightBalance b/c it incorporates all the dailygains for today too
        taxAmount,
        taxBalance,
        amount: deadamount,
        balance: originalBalance + deadamount,
        qty,
        qtyBalance,
      };
      //info('FIFO: index',index,': dead line on lineno',l.lineno,', returning', ret, ' for line = ',l);
      prevreturn = ret;
      return ret;
    }

    // The only other kinds of lines are those that must match the bank account (sales and purchases).
    if (l.qty === 0) {
      throw new LineError({ line: l, acct, msg: 'Line has zero quantity change, but it is not an inventory-cattle-dailygain line.  This is not allowed in livestock inventories' });
    }

    // Purchase
    if (l.qty > 0) {
      if (l.weight <= 0) {
        throw new LineError({ line: l, acct, msg: 'Line has positive head but zero or negative weight' });
      }
      // A purchase causes market value to deviate from fifo value.  Taxes keep fifo value, but the amount and weight
      // are whatever the cash account said they were.
      const ret = {
        ...l,
        index,
        amount: l.amount,                                   // Cannot use the line.balance here
        balance: l.amount + originalBalance,                // b/c the line balance is wrong.
        weight: l.weight,                                   // So just add line-specified amount/weight
        weightBalance: l.weight + originalWeightBalance,    // to prev balance we have computed thus far.
        taxAmount,                                          // This keeps dailygain separate from purchase/sale
        taxBalance,                                         // since the amount/weight is just the line-specified
        qty,                                                // amount and weight.
        qtyBalance,
      };
      //info('FIFO: index',index,': purchase line on lineno',l.lineno,', returning', ret, 'for line = ',l);
      prevreturn = ret;
      return ret;
    }

    // Sale:
    if (l.weight >= 0) {
      throw new LineError({ line: l, acct, msg: 'Sale line has negative head but zero or positive weight' });
    }
    const ret = {
      ...l,
      index,
      amount: l.amount,                                     // See above for purchase about why
      balance: l.amount + originalBalance,                 // these balances are what they are.
      weight: l.weight,
      weightBalance: l.weight + originalWeightBalance,
      taxAmount,
      taxBalance,
      qty,
      qtyBalance,
      category: l.category,
      lineno: l.lineno,
    };
    //info('FIFO: index',index,': sale line on lineno',l.lineno,', returning',ret,'for line = ',l);
    prevreturn = ret;
    return ret;
  });
}

function expectedWeight({ today, rog, group }: { today: Moment, rog: number, group: Group }): number {
  return group.qty * expectedWeightPerHead({ today, rog, group });
}
function expectedWeightPerHead({ today, rog, group }: { today: Moment, rog: number, group: Group }): number {
  const days = moment.duration(today.diff(group.date)).as('days');
  return group.incomingWeightPerHead + (rog * days);
}

function priceWeightPointsFromLine(line: LivestockInventoryAccountTx): PriceWeightPoint[] | null {
  try {
    if (typeof line.note !== 'object') throw 'Not an object';
    if (!('aveValuePerWeight' in line.note)) throw 'Note on line has no aveValuePerWeight';
    if (typeof line.note.aveValuePerWeight  !== 'number' && !Array.isArray(line.note.aveValuePerWeight)) {
      throw 'No aveValuePerWeight';
    }
  } catch(e: any) {
    return null;
  }
  // If it's just a number, just need a straight line w/ all the same weights
  if (typeof line.note.aveValuePerWeight === 'number') {
    return [ { weight: 0, price: line.note.aveValuePerWeight }, { weight: 1500, price: line.note.aveValuePerWeight } ];
  }
  try {
    assertPriceWeightPoints(line.note.aveValuePerWeight);
  } catch (e: any) {
    return null;
  }
  return line.note.aveValuePerWeight; // otherwise, it's PriceWeightPoint[] already
}

function formulaPricePerLb({ formula, weight }: { formula: PriceWeightPoint[], weight: number }): number {
  if (formula.length < 1) {
    throw new MultiError({ msg: 'There are no points in the formula for computing price for a given weight' });
  }
  const first = formula[0]!;
  if (weight < first.weight) {
    //info('formulaPricePerLb: weight',weight,'is before first point',first,', returning first.price');
    return first.price; // flat line before initial weight
  }
  for (const [index, point] of formula.entries()) {
    if (index === 0) continue;
    const prev = formula[index-1]!;
    if (weight < point.weight) {
      const percentFromPrevWeight = (weight - prev.weight)/(point.weight - prev.weight);
      //info('formulaPricePerLb: weight',weight,'is < point.weight', point.weight, ', and percentFromPrevWeight = ', percentFromPrevWeight, '.  point = ',point,', prev = ',prev);
      return prev.price + percentFromPrevWeight * (point.price - prev.price);
    }
  }
  // If we get here, the weight is >= the top weight, so flat line after top weight
  return formula[formula.length-1]!.price;
}
