import type * as google from '../';
import debug from 'debug';
import deepequal from 'deep-equal';

const info = debug('test/google:info');

const pathroot = `/AF-AUTOMATEDTESTS/TEST-${+(new Date())}`;
info('Running tests against root path: ', pathroot);

type Google = typeof google;

export async function itLoads(g: Google) {
  info('itLoads: starting');
  if (!g) throw 'Google is not ok';
  if (!window.gapi) throw 'GAPI is not ok';
  info('itLoads: passed');  
};

export async function core(g: Google) {
  info('core: starting');
  info('core: auth2');
  const auth2 = await g.core.auth2();
  if (!auth2) throw 'auth2 did not load';
  info('core: client');
  const c = await g.core.client();
  if (!c) throw 'client did not load';
  if (!c.drive) throw 'client did not load drive api';
  if (!c.sheets) throw 'client did not load sheets api';
  info('core: passed');
};

export async function auth(g: Google) {
  info('auth: starting');
  const isauthed = await g.auth.authorize();
  if (!isauthed) throw 'Auth did not return truthy';
  info('auth: passed');  
}

export async function drive(g: Google) {
  info('drive: starting');
  const path = `${pathroot}/DRIVE1`;
  info('drive: ensurePath');
  const r1 = await g.drive.ensurePath({path});
  if (!r1) throw `ensurePath returned null`;
  if (!r1.id || r1.id === 'root') throw `ensurePath returned falsy id or 'root' (${r1.id})`;

  info('drive: idFromPath');
  const r2 = await g.drive.idFromPath({path});
  if (!r2) throw `idFromPath returned falsey`;
  if (r1.id !== r2?.id) throw `ensurePath and idFromPath did not return the same id (${r1?.id} vs. ${r2?.id})`;

  info('drive: createFolder');
  const newFolder = await g.drive.createFolder({ parentid: r2.id, name: "FOLDER1" });
  const r3 = await g.drive.idFromPath({ path: `${path}/FOLDER1` });
  if  (!newFolder || newFolder.id !== r3?.id) throw `createFolder did not return same id as idFromPath (${newFolder?.id} vs. ${r3?.id})`;

  info('drive: createFile');
  const newFile = await g.drive.createFile({ parentid: r2.id, name: "FILE1", mimeType: 'application/vnd.google-apps.spreadsheet' });
  const r4 = await g.drive.idFromPath({ path: `${path}/FILE1` });
  if  (!newFile || newFile.id !== r4?.id) throw `createFile did not return same id as idFromPath (${newFile?.id} vs. ${r4?.id})`;

  info('drive: passed');
}

export async function sheets(g: Google) {
  info('sheets: starting');
  const path = `${pathroot}/SHEETS1`;
  const folder = await g.drive.ensurePath({path});
  if (!folder) throw `ensurePath did not return an id for the SHEETS1 folder`;

  info('sheets: createSpreadsheet w/o worksheetName');
  const r2 = await g.sheets.createSpreadsheet({ 
    parentid: folder.id, 
    name: 'testwb1', 
  });
  if (!r2?.id) throw `createSpreadsheet returned null instead of an id when creating spreadsheet without worksheetName`;
  const sheet1 = await g.sheets.getSpreadsheet({ id: r2.id });
  if (!sheet1 || !sheet1?.sheets) throw `createSpreadsheet failed to getSpreadsheet when creating without worksheetName`;
  if (sheet1?.sheets?.length < 1) throw `createSpreadsheet failed to create a spreadsheet with at least one sheet in it`;

  info('sheets: createSpreadsheet w/ worksheetName');
  const worksheetName = 'testsheet2';
  const r3 = await g.sheets.createSpreadsheet({ 
    parentid: folder.id, 
    name: 'testwb2', 
    worksheetName,
  });
  if (!r3?.id) throw `createSpreadsheet returned null instead of an id when creating spreadsheet with worksheetName`;
  const id = r3.id; // keep for later tests
  const sheet2 = await g.sheets.getSpreadsheet({ id: r3.id });
  if (!sheet2 || !sheet2.sheets) throw `createSpreadsheet failed to getSpreadsheet after creating with a worksheetName`;
  if (!sheet2.sheets.find((s) => s?.properties?.title === 'testsheet2')) {
    throw `createSpreadsheet failed to set worksheetName to testsheet1, sheet names are ${sheet2.sheets.map(s => s?.properties?.title).join(',')}`;
  }

  info(`sheets: putRow`);
  const cols = [ 'first col', 'second col', 'third col' ];
  const r4 = await g.sheets.putRow({ 
    id,
    worksheetName,
    row: '1',
    cols,
  });
  if (!r4 || !deepequal(r4,cols)) throw `putRow failed to return updated values (${r4}) equal to passed values (${cols})`;
  const allrows = await g.sheets.getAllRows({ id, worksheetName });
  if (!deepequal(cols, allrows?.values?.[0])) {
    throw `putRow failed to put the given row to the spreadsheet: values in sheet (${allrows?.values}) are not equal to cols (${cols})`;
  }

  info(`sheets: arrayToLetterRange`);
  const str = g.sheets.arrayToLetterRange("1", cols);
  if (str !== 'A1:C1') throw `arrayToLetterRange: created range string (${str}) is not what was expected ('A1:C1')`;

  info(`sheets: all tests passed`);
}

export default async function run(g: Google) {
  await itLoads(g);
  await core(g);
  await auth(g);
  await drive(g);
  await sheets(g);
  info('All Google Tests Passed');
}
