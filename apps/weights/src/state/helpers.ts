import { action } from 'mobx';
import { state } from './state';
import dayjs from 'dayjs';
import debug from 'debug';
import * as livestock from '@aultfarms/livestock';
import * as google from '@aultfarms/google';
import pLimit from 'p-limit';

import { changeTab, records, msg } from './actions';

const info = debug("weights/state#actions/helpers:info");
const warn = debug("weights/state#actions/helpers:warn");

const limit = pLimit(4); // allows up to 4 simultaneous promises

// Funcion that moved all the old spreadsheets into the new format for me:
export const cleanOldSheets = action('cleanOldSheets', async () => {
  changeTab({ active: 'errors' });
  const trellorecords = records();
  // 1: grab all old files in the weights folder
  const path = '/Ault Farms Shared/LiveData/Weights';
  const files = await google.drive.ls({ path });
  if (!files) {
    msg('THERE ARE NO FILES FOUND AT '+path, 'bad');
    return;
  }
  msg('Found '+files.contents.length+' total files in folder');
  info('Found files: ', files);
  let oldfiles = files.contents.filter(f => 
    f.name.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}_Weights$/) 
    && f.mimeType === google.sheets.GoogleSheetsMimeType
    && f.kind === 'drive#file'
  );
  //msg('JUST FOR TESTING I AM LIMITING THE TOTAL FILES TO 20', 'bad');
  //oldfiles = oldfiles.slice(0,20);

  msg('Found '+oldfiles.length+' old files to work on');
  const years: { [year: number]: livestock.WeightRecord[] } = [];
  await Promise.all(oldfiles.map(async (file) => {
    const weighdate = file.name.replace(/_Weights/,'');
    if (!weighdate.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
      msg('ERROR: could not extract weighdate ('+weighdate+') from file name ('+file.name+')');
      throw new Error('ERROR: could not get weighdate from name');
    }
    const year = dayjs(weighdate, 'YYYY-MM-DD').year();
    const jsonRecords = await limit(() => google.sheets.spreadsheetToJson({ id: file.id, filename: file.name }));
    if (!jsonRecords) {
      msg('ERROR: spreadsheetToJson returned null for file ' + file.name, 'bad');
      throw new Error('ERROR: spreadsheetToJson returned null for file '+file.name);
    }
    if (!jsonRecords['weights']) {
      msg('ERROR: file '+file.name+' did not have weights sheet!', 'bad');
      throw new Error('ERROR: file '+file.name+' did not have weights sheet!');
    }
    const tagsSeen: { [tag: string]: true } = {};
    for (const [index, j] of jsonRecords['weights'].data.entries()) {
      j.lineno = index+2;
      j.weighdate = weighdate;
      j.tag = { color: j.color || '', number: +(j.number) || '' };
      delete j.color;
      delete j.number;
      j.weight = +(j.weight || 0);
      j.adj_wt = +(j.adj_wt || 0);
      j.days = +(j.days || 0);
      j.lbs_gain = +(j.lbs_gain || 0);
      j.rog = +(j.rog || 0);
      if (!j.group) j.group = '';
      if (!j.in_date) j.in_date = '';
      if (!j.sort) j.sort = '';

      try {
        livestock.assertWeightRecord(j);
        // Fix all "repeat" tags as notags:
        const tag = j.tag.color+j.tag.number;
        if (!tagsSeen[tag]) {
          tagsSeen[tag] = true;
        } else {
          info('weighdate ', weighdate, ': TAG',tag,'ALREADY SEEN, setting to NOTAG1');
          // This is a repeat tag, change it's tag back to NOTAG1
          j.tag.color="NOTAG";
          j.tag.number=1;
        }
        try {
          livestock.weights.computeRow({ row: j, records: trellorecords, recheckTagGroup: true });
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
});


