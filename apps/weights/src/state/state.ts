import { observable, autorun } from 'mobx';
import dayjs from 'dayjs';
import {ErrorWeight, SpreadsheetInfo, WeightRecord, WeightRecordsInfo} from '@aultfarms/livestock';
import * as livestock from '@aultfarms/livestock';
import debug from 'debug';
import { defaultOrg } from '@aultfarms/trello';

const warn = debug('weights/state#state:warn');

export type Msg = {
  type?: 'good' | 'bad',
  text: string,
};

//----------------------------------------
// Config
export type Config = {
  basepath: string,
  trelloOrg: string,
};
const defaultConfig = {
  basepath: livestock.weights.defaultBasepath,
  trelloOrg: defaultOrg,
};
let config = defaultConfig;
try {
  const localConfig = JSON.parse(localStorage.getItem('weights-config') || '');
  if (localConfig && localConfig.basepath) {
    config = localConfig;
  }
} catch (e) {
  warn('Could not parse localStorage["weights-config"]');
  // JSON parse failed
}
// This either writes the default config, or just writes the same localConfig back.
// There is an autorun the updates localStorage as config changes in the state.
localStorage.setItem('weights-config', JSON.stringify(config));
//----------------------------------------

export type Order = 'row' | 'tag' | 'weight' | 'group' | 'days' | 'rog' | 'sort';
export type State = {
  config: Config,
  isInitialized: boolean,
  window: {
    isSmall: boolean,
    orientation: 'portrait' | 'landscape',
    width: number,
    height: number,
  },
  date: string,
  tabSelector: {
    active: 'weights' | 'errors' | 'prefs',
  },
  tagInput: {
    row: number,
    tag: {
      number: number,
      color: string,
    },
  },
  weightInput: {
    row: number,
    weight: number,
  },
  includeTodayInPastStats: boolean,
  stats: {
    today: livestock.ComputedStats,
    pastyear: livestock.ComputedStats,
    all: livestock.ComputedStats,
  },
  order: Order[],

  records: { rev: number }, // big data
  // Current year things:
  weights: WeightRecord[],
  sheetinfo: SpreadsheetInfo,
  errors: ErrorWeight[],
  header: string[],
  maxlineno: number,
  // All loaded years:
  yearsheets: {
    [year: number]: WeightRecordsInfo,
  },
  msgs: Msg[],
};



export const state = observable<State>({
  config,
  isInitialized: false,
  window: {
    isSmall: false,
    orientation: 'portrait',
    width: 0,
    height: 0,
  },
  date: dayjs().format('YYYY-MM-DD'),
  tabSelector: {
    active: 'weights',
  },
  tagInput: {
    row: 0,
    tag: {
      number: 0,
      color: '',
    },
  },
  weightInput: {
    row: 0,
    weight: 0,
  },
  includeTodayInPastStats: false,
  stats: {
    today:    { sorts: {}, incoming: {}, sources: {}, ranges: {}, days: {}, months: {}, years: {}, },
    pastyear: { sorts: {}, incoming: {}, sources: {}, ranges: {}, days: {}, months: {}, years: {}, },
    all:      { sorts: {}, incoming: {}, sources: {}, ranges: {}, days: {}, months: {}, years: {}, },
  },
  order: [ 'row' ],
  records: { rev: 0 },
  weights: [],
  sheetinfo: { id: '', path: '', worksheetName: '' },
  header: [],
  maxlineno: 1,
  errors: [],
  yearsheets: {},
  msgs: [
    { type: 'good', text: 'Initializing...' },
  ],
});

//-----------------------------------------------
// Autoruns: this has to run after state
// Every time the state.config changes, save it to localStorage:
autorun(() => {
  localStorage.setItem('weights-config', JSON.stringify(state.config));
});
