import type * as google from '../';
import debug from 'debug';
import deepequal from 'deep-equal';
import xlsx from 'xlsx-js-style'; // 'sheetjs-style'
import { stringify } from 'q-i';
import { pathroot } from './util';

const info = debug('test/google:info');

type Google = typeof google;

export default async function drive(g: Google) {
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

  info('drive: ls');
  const lsFolder = await g.drive.createFolder({ parentid: r2.id, name: "FOLDER2" });
  if (!lsFolder?.id) throw `ls: createFolder returned falsey id (${lsFolder})`;
  await g.drive.createFile({ parentid: lsFolder.id, name: "FILE1", mimeType: 'application/vnd.google-apps.spreadsheet' });
  await g.drive.createFile({ parentid: lsFolder.id, name: "FILE2", mimeType: 'application/vnd.google-apps.spreadsheet' });
  const r5 = await g.drive.ls({ path: `${path}/FOLDER2` });
  if (!r5) throw `ls: did not return truthy result (${r5})`;
  if (!r5.id || typeof r5.id !== 'string') throw `ls: did not return a string for id (${r5.id})`;
  if (!Array.isArray(r5.contents)) throw `ls: did not return an array of contents (${r5.contents})`;
  if (r5.contents.length !== 2) throw `ls: returned more than the two files we put in there.`;
  if (!r5.contents.find(c => c.name === 'FILE1')) throw `ls: FILE1 was not listed in the results`;
  if (!r5.contents.find(c => c.name === 'FILE2')) throw `ls: FILE2 was not listed in the results`;

  const r6 = await g.drive.ls({ path: `${path}/FOLDER2/FILE1` }); // try ls-ing a file:
  if (!r6 || !r6.id || typeof r6.id !== 'string') throw `ls: when ls-ing a file, did not return a string for id (${r6?.id})`;
  if (!Array.isArray(r6.contents) || r6.contents.length !== 0) throw `ls: when ls-ing a file, contents was not an empty array (${r6.contents})`;

  info('drive: uploadArrayBuffer');
  const data = [ { col1: 'row1col1', col2: 'row1col2' }, { col1: 'row2col2', col2: 'row2col2' } ];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(data), 'testsheet');
  const r7 = await g.drive.uploadArrayBuffer({
    filename: 'TEST_XLSX.xlsx',
    parentid: r2.id, // ${path}/TEST_XLSXL.xlsx
    type: g.sheets.XlsxMimeType,
    buffer: xlsx.write(wb, { bookType: 'xlsx', type: 'array' }),
  });
  if (!r7) throw `uploadArrayBuffer returned null`;
  const r8 = await g.drive.getFileContents({ id: r7.id });
  if (!r8) throw `getFileContents returned null`;
  const wb2 = xlsx.read(r8, { type: 'array' });
  const data2 = xlsx.utils.sheet_to_json(wb2.Sheets['testsheet']!);
  if (!deepequal(data, data2)) throw `Downloaded xlsx differs from uploaded xlsx.  Uploaded = ${stringify(data)}, Downloaded = ${stringify(data2)}`;

  info('drive: copyAllFilesFromFolderToExistingFolder');
  const sourceFolder = await g.drive.createFolder({ parentid: r2.id, name: 'COPYSOURCE' });
  const destFolder = await g.drive.createFolder({ parentid: r2.id, name: 'COPYDEST' });
  if (!sourceFolder?.id) throw `ls: createFolder returned falsey id (${sourceFolder?.id})`;
  if (!destFolder?.id) throw `ls: createFolder returned falsey id (${destFolder?.id})`;
  await g.drive.createFile({ parentid: sourceFolder.id, name: "FILE1", mimeType: 'application/vnd.google-apps.spreadsheet' });
  await g.drive.createFile({ parentid: sourceFolder.id, name: "FILE2", mimeType: 'application/vnd.google-apps.spreadsheet' });
  await g.drive.copyAllFilesFromFolderToExistingFolder({ sourceFolderid: sourceFolder.id, destinationFolderid: destFolder.id });
  const r9 = await g.drive.ls({ id: destFolder.id });
  if (!r9) throw `Could not ls destination folder id ${destFolder.id}`;
  if (r9.contents.length !== 2) throw `Expected 2 files in destination folder, but there are ${r9.contents.length} instead`;
  if (!r9.contents.find(f => f.name === 'FILE1')) throw `Could not find FILE1 in destination after copy`;
  if (!r9.contents.find(f => f.name === 'FILE2')) throw `Could not find FILE2 in destination after copy`;


  info('drive: passed');
}