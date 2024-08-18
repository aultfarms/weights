import { action } from 'mobx';
import { state } from './state';
import dayjs from 'dayjs';
import debug from 'debug';
import * as livestock from '@aultfarms/livestock';
import * as google from '@aultfarms/google';
import pLimit from 'p-limit';

import { changeTab, msg } from './actions';

const info = debug("weights/state#actions/helpers:info");
const warn = debug("weights/state#actions/helpers:warn");

const limit = pLimit(1); // allows up to 4 simultaneous promises

// Funcion that moved all the old spreadsheets into the new format for me:
export const cleanOldSheets = action('cleanOldSheets', async () => {
  changeTab({ active: 'errors' });

  const weights_2023 = await livestock.weights.fetchYearWeights({ basepath: state.config.basepath, year: 2023 });
  const weights_2024 = await livestock.weights.fetchYearWeights({ basepath: state.config.basepath, year: 2024 });

  const previously_seen_tags: { [tag: string]: number } = {};
  let changes_2023 = weights_2023.weights.filter(w => {
    if (w.tag.color === 'NOTAG') return false;
    const tagstr = w.tag.color + w.tag.number;
    if (previously_seen_tags[tagstr]) {
      info('2023: already seen tag ', tagstr, previously_seen_tags[tagstr], ' times, this one on ', w.weighdate)
      return true;
    }
    if (typeof previously_seen_tags[tagstr] === 'undefined') {
      previously_seen_tags[tagstr] = 0;
    }
    previously_seen_tags[tagstr]!++;
    return false;
  });
  let changes_2024 = weights_2024.weights.filter(w => {
    if (w.tag.color === 'NOTAG') return false;
    const tagstr = w.tag.color + w.tag.number;
    if (previously_seen_tags[tagstr]) {
      info('2024: already seen tag ', tagstr, previously_seen_tags[tagstr], ' times, this one on ', w.weighdate)
      return true;
    }
    if (typeof previously_seen_tags[tagstr] === 'undefined') {
      previously_seen_tags[tagstr] = 0;
    }
    previously_seen_tags[tagstr]!++;
    return false;
  });

  // STOPPED HERE: next up, change all tags to notag, and save back to db.
  // Do we need to use batchUpdate?  Do we need weights_2023.sheetinfo?
  changes_2023 = changes_2023.map(w => ({
    ...w,
    tag: { color: 'NOTAG', number: 1 },
    rog: 0,
    lbs_gain: 0,
    group: '',
    in_date: '',
    days: 0,
  }));
  changes_2024 = changes_2024.map(w => ({
    ...w,
    tag: { color: 'NOTAG', number: 1 },
    rog: 0,
    lbs_gain: 0,
    group: '',
    in_date: '',
    days: 0,
  }));

  info('Batch upserting rows to Google.');
  info('2023 changes (',changes_2023.length,') out of ',weights_2023.weights.length,' total = ', changes_2023);
  //await livestock.weights.batchSaveWeightRows({ weights: changes_2023, sheetinfo: weights_2023.sheetinfo, header: weights_2023.header, insertOrUpdate: 'UPDATE' });
  info('2023 changes are DONE!')
  info('2024 changes (',changes_2024.length,') out of ',weights_2024.weights.length,' total = ', changes_2024);
  //await livestock.weights.batchSaveWeightRows({ weights: changes_2024, sheetinfo: weights_2024.sheetinfo, header: weights_2024.header, insertOrUpdate: 'UPDATE' });
  info('2024 changes are DONE!')

  info('ALL DONE! NOTE: the lines that actually change the spreadsheets are commented out.  Uncomment to re-enable, but you better look at it')
  return;
  /*
  msg('Found '+oldfiles.length+' old files to work on.');
  const years: { [year: number]: livestock.WeightRecord[] } = [];
        try {
        } catch(e: any) {
          warn('WARNING: computeRow threw error for row', j, ', error was:', e);
        }
        if (!years[year]) years[year] = [];
        years[year].push(j);
      } catch(e: any) {
        msg('ERROR: record ('+index+') did not pass validation.  See console for error');
        warn('ERROR: record',index,'did not pass validation.  Record was: ', j, ', error was: ', e);
      }
    }
  }));
  info('all things read from all files by year = ', years);
  info('ensuring all years exist in google');
  const sheets: { [year: number]: livestock.WeightRecordsInfo } = {};
  for (const year of Object.keys(years)) {
    sheets[+(year)] = await livestock.weights.fetchYearWeights({
      basepath: state.config.basepath,
      year,
    })
  }
  info('All the sheets: ', sheets);
  info('Batch upserting rows to Google');
  await Promise.all(Object.entries(years).map(([y, weights]) => limit(async () => {
    const sheet = sheets[+(y)];
    if (!sheet) {
      throw new Error('FAIL: thought all the year sheets we needed were made, but we are missing '+y);
    }
    let maxlineno = sheet.weights.reduce((acc,w) => (acc > w.lineno) ? acc : w.lineno, 0) + 1;
    if (maxlineno === 1) maxlineno = 2; // has to start at least after header in empty sheet
    for (const w of weights) {
      w.lineno = maxlineno; // keeps inserting them at the end of the current sheet
    }
    await livestock.weights.batchSaveWeightRows({ weights, sheetinfo: sheet.sheetinfo, header: sheet.header, insertOrUpdate: 'INSERT' });
    info('Successfully saved',weights.length,'records for year',y);
  })));
  info('Moving files to DONE');
  const donefolder = await google.drive.ensurePath({ path: state.config.basepath+'/DONE' });
  if (!donefolder) {
    warn('ERROR: could not ensurePath for done files: ',state.config.basepath+'/DONE');
    throw new Error('ERROR: could not ensurePath for done files: '+state.config.basepath+'/DONE');
  }
  for (const file of oldfiles) {
    await google.drive.move({ sourceFileid: file.id, sourceFolderid: files.id, destinationFolderid: donefolder.id });
    info('Moved old file to DONE/'+file.name);
  }


  msg('NOT DONE WITH cleanOldSheets', 'bad');
  */
});
