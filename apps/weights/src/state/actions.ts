import { action, runInAction } from 'mobx';
import { Msg, state, State } from './state';
import dayjs from 'dayjs';
import debug from 'debug';
import * as livestock from '@aultfarms/livestock';
import pLimit from 'p-limit';
export { cleanOldSheets } from './helpers';

const info = debug("weights/state#actions:info");
//const warn = debug("weights/state#actions:warn");

const limit = pLimit(4); // allows up to 4 simultaneous promises

//------------------------------------------------------
// Help for scrolling:
export const scrollToTag = action('scrollToTag', () => {
  const el = document.getElementById('tagScrollToMe');
  if (el) el.scrollIntoView();
});
export const scrollToWeight = action('scrollToWeight', () => {
  const el = document.getElementById('weightScrollToMe');
  if (el) el.scrollIntoView();
});
export const windowSize = action('windowSize', ({ width, height}: { width: number, height: number }) => {
  state.window.width = width;
  state.window.height = height;
  state.window.orientation = width < height ? 'portrait' : 'landscape';
  state.window.isSmall = state.window.orientation === 'portrait' ? (width < 767) : (height < 500);
});

//-------------------------------------------------------
// Misc view functions
export const changeTab = action('changeTab', (tab: State['tabSelector']) => {
  state.tabSelector = tab;
});

//-------------------------------------------------------
// Changing values
export const changeIsInitialized = action('changeIsInitialized', (val: boolean) => {
  state.isInitialized = val;
});
// Records are big, and they only come in at the start, no need to save them in the state:
let _records: livestock.LivestockRecords | null = null;
export const records = action('records', (records?: livestock.LivestockRecords): livestock.LivestockRecords => {
  if (records) {
    _records = records;
    state.records.rev++;
  }
  if (!_records) throw new Error('ERROR: no records yet!');
  return _records;
});

export const changeDate = action('changeDate', async (date: string) => {
  state.date = date;
  // Refilter things for "today" for this date
  await loadWeights();
});

export const loadWeights = action('loadWeights', async () => {
  msg('Loading past 5 year\'s weights');
  const date = dayjs(state.date, 'YYYY-MM-DD');
  if (!date.isValid()) {
    msg('ERROR: date '+state.date+' is not valid, cannot loadWeights', 'bad');
    return;
  }
  const year = date.year();
  // First, ensure the main sheet for this year:
  const thisyearresult = await limit(() => livestock.weights.fetchYearWeights({
    basepath: state.config.basepath,
    year,
  }));
  // Then, in parallel, grab the previous 5 years
  const [ year1, year2, year3, year4, year5 ] = await Promise.all([
    limit(() => livestock.weights.fetchYearWeights({ basepath: state.config.basepath, year: year-1 })),
    limit(() => livestock.weights.fetchYearWeights({ basepath: state.config.basepath, year: year-2 })),
    limit(() => livestock.weights.fetchYearWeights({ basepath: state.config.basepath, year: year-3 })),
    limit(() => livestock.weights.fetchYearWeights({ basepath: state.config.basepath, year: year-4 })),
    limit(() => livestock.weights.fetchYearWeights({ basepath: state.config.basepath, year: year-5 })),
  ]);

  runInAction(() => {
    // Store them all in the state for now:
    state.yearsheets[year] = thisyearresult;
    state.yearsheets[year-1] = year1;
    state.yearsheets[year-2] = year2;
    state.yearsheets[year-3] = year3;
    state.yearsheets[year-4] = year4;
    state.yearsheets[year-5] = year5;
    // Set the current stuff for current year and today:
    state.sheetinfo = thisyearresult.sheetinfo;
    state.errors = thisyearresult.errors;
    state.header = thisyearresult.header;
    state.weights = thisyearresult.weights.filter(w => w.weighdate === state.date);
    let maxlineno = thisyearresult.weights.reduce((acc,w) => w.lineno > acc ? w.lineno : acc, 0);
    if (maxlineno < 1) { // there are no lines in the sheet
      maxlineno = 1;
    }
    state.maxlineno = maxlineno;
    // Always make sure we have at least one row for the UI:
    if (state.weights.length < 1) appendNewRow();
    updateAllStats();
  });
});

export const changeIncludeTodayInPastStats = action('includeTodayInPastStats', (val: boolean) => {
  state.includeTodayInPastStats = val;
  updateAllStats();
});

// XXX STOPPED HERE:
// - update all stats each time for now until we see it's too slow (or at least compare turning on/off).
//   you can do that by just calling updateAllStats at end of updateTodayStats
// - then finish fixing things for new stats model
// - Could add button to refresh stats in app, or a choice whether "all stats" includes today or not.
//   Could also show a +/- on "all" stats based on the effect today has on it. <-- I like this

export const updateTodayStats = action('updateTodayStats', () => {
  state.stats.today = livestock.weights.computeStats(state.weights);
});

// Tests is a is before b without needing to make a full dayjs object
function fastIsOnOrAfterDay(a: string, b: Date) {
  const aparts = a.split('-');
  const adate = new Date(+(aparts[0]), +(aparts[1])-1, +(aparts[2]));
  return adate >= b;
}
export const updateAllStats = action('updateAllStats', () => {
  const thisyear = dayjs(state.date, 'YYYY-MM-DD').year();
  const lastyear = thisyear - 1;
  const oneYearAgoDate = dayjs(state.date, 'YYYY-MM-DD').subtract(1, 'year').toDate();
  let pastYearWeights: livestock.WeightRecord[] = state.includeTodayInPastStats ? state.weights : [];
  let allWeights: livestock.WeightRecord[] = state.includeTodayInPastStats ? state.weights : [];
  updateTodayStats();
  for (const [yearstr, info] of Object.entries(state.yearsheets)) {
    const year = +(yearstr);
    let weights = info.weights;
    // This may seem wrong to always remove today's weights from the list, but it's actually just removing
    // the stale old copies of today's weights from the list since they were already included or not above
    // from the in-memory copy in state.weights that is more recent.
    if (year === thisyear) { // quick pre-determiniation of whether we need filtering
      weights = weights.filter(w => w.weighdate === state.date);
    }
    allWeights = [ ...allWeights, ...weights ];
    // Quick pre-determination of whether we need to compare all the years to include in past year stats:
    if (year >= lastyear) {
      pastYearWeights = [ ...pastYearWeights, ...(weights.filter(w => fastIsOnOrAfterDay(w.weighdate, oneYearAgoDate))) ];
    }
  }
  state.stats.all = livestock.weights.computeStats(allWeights);
  state.stats.pastyear = livestock.weights.computeStats(pastYearWeights);
  updateTodayStats();
});



export const msg = action('msg', (msg: string | Msg, type?: 'good' | 'bad') => {
  if (typeof msg === 'string') msg = { text: msg };
  if (typeof type !== 'undefined') msg.type = type;
  info('MSG: '+msg.text);
  state.msgs.push(msg);
  if (state.msgs.length > 100) {
    state.msgs = state.msgs.slice(-100);
  }
});

export const changeWeight = action('changeWeight', (w: number) => {
  state.weightInput.weight = w;
});
export const changeTag = action('changeTag', ({ color, number }: { color?: string, number?: number }) => {
  if (typeof number !== 'undefined') {
    state.tagInput.tag.number = number;
    scrollToTag();
  }
  if (typeof color !== 'undefined') {
    state.tagInput.tag.color = color;
    scrollToTag();
  }
});

export const changeSort = action('changeSort', async (index: number, sort: string) => {
  if (!state.isInitialized) {
    msg('WARNING: tried to changeSort, but app is not yet initialized');
    return;
  }
  msg('Saving sort type change...', 'bad');
  if (!state.weights?.[index]) {
    msg('WARNING: attempted to changeSort, but the requested row index ('+index+') does not exist');
    return;
  }
  runInAction(() => state.weights![index].sort = sort);
  livestock.weights.saveWeightRow({ sheetinfo: state.sheetinfo, header: state.header, weight: state.weights[index]  });
  updateTodayStats();
  msg('Sort type change saved', 'good');
});

export const appendNewRow = action('appendNewRow', () => {
  state.weights.push({
    lineno: state.maxlineno+1,
    weighdate: state.date,
    tag: { color: '', number: 0 }, // copy
    weight: 0,
    adj_wt: 0,
    group: '',
    in_date: '',
    days: 0,
    lbs_gain: 0,
    rog: 0,
    sort: livestock.weights.sorts[0]!,
  });
  state.maxlineno++;
});

export const loadTagInputFromRow = action('loadTagInputFromRow', (row: number) => {
  if (!state.isInitialized) {
    msg('WARNING: tried to loadTagInputFromRow, but app is not yet initialized');
    return;
  }
  const numrows = state.weights.length;
  state.tagInput.row = row;
  if (row >= numrows) { // new row
    state.tagInput.tag.number = 0;
    appendNewRow();
    return;
  }
  if (state.weights[row]) {
    changeTag(state.weights[row]!.tag);
  } 
});

export const loadWeightInputFromRow = action('loadWeightInputFromRow', (row: number) => {
  if (!state.isInitialized) {
    msg('WARNING: tried to loadWeightInputFromRow, but app is not yet initialized');
    return;
  }
  const numrows = state.weights.length;
  state.weightInput.row = row;
  if (row >= numrows) { // new row
    row = numrows;
    state.weightInput.weight = 0;
    appendNewRow();
    return;
  }
  changeWeight(state.weights[row]!.weight);
});

export const moveTagInput = action('moveTagInput', (row: number) => {
    if (row < 0) row = 0;
    const numweights = state.weights.length;
    if (row > numweights)  row = numweights;
    loadTagInputFromRow(row);
    scrollToTag();
});
export const moveWeightInput = action('moveWeightInput', (row: number) => {
    if (row < 0) row = 0;
    const numweights = state.weights.length;
    if (row > numweights)  row = numweights;
    loadWeightInputFromRow(row);
    scrollToTag();
});
 
export const moveTagInputUp   = action('moveTagInputUp',   () => moveTagInput(state.tagInput.row-1));
export const moveTagInputDown = action('moveTagInputDown', () => moveTagInput(state.tagInput.row+1));
export const moveWeightInputUp   = action('moveWeightInputUp',   () => moveWeightInput(state.weightInput.row-1));
export const moveWeightInputDown = action('moveWeightInputDown', () => moveWeightInput(state.weightInput.row+1));


//-------------------------------------------------------
// Saving things
export const saveTag = action('saveTag', async () => {
  msg('Saving tag...', 'bad');
  if (state.tagInput.row === state.weights.length) { // This is a new row
    appendNewRow();
  }
  const row = state.weights[state.tagInput.row];
  if (!row) {
    msg('WARNING: tried to save tag at row '+state.tagInput.row+', but there is no record for that row in list of weights');
    return;
  }
  row.tag = { ...state.tagInput.tag };
  try { 
    livestock.weights.computeRow({ row, records: records(), recheckTagGroup: true });
  } catch(e: any) {
    msg('ERROR: could not compute row values.  Error was:'+e.toString());
    return;
  }
  info('About to save this computed weight record: ', row, ' with these headers: ', state.header);
  await limit(() => livestock.weights.saveWeightRow({ weight: row, header: state.header, sheetinfo: state.sheetinfo }));
  moveTagInputDown();
  updateTodayStats();
  msg('Tag Saved', 'good');
});

export const saveWeight = action('saveWeight', async () => {
  msg('Saving weight...', 'bad');
  if (state.weightInput.row === state.weights.length) { // This is a new row
    appendNewRow();
  }
  const row = state.weights[state.weightInput.row];
  if (!row) {
    msg('WARNING: row '+state.weightInput.row+' from weightInput does not exist in weight records', 'bad');
    return;
  }
  row.weight = state.weightInput.weight*10;
  try {
    livestock.weights.computeRow({ row, records: records() });
  } catch(e: any) {
    msg('ERROR: could not compute row values.  Error was:'+e.toString());
    return;
  }
  await limit(() => livestock.weights.saveWeightRow({ weight: row, header: state.header, sheetinfo: state.sheetinfo }));
  moveWeightInputDown();
  updateTodayStats();
  msg('Weight Saved', 'good');
});


