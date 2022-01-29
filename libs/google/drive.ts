// Google Drive functions
import debug from 'debug';
import { client } from './gapi';
import { createSpreadsheet } from './sheets';
import oerror from '@overleaf/o-error';
// Note these are node-specific @googleapis libraries, but they have the 
// typescript typings we need:
import type { drive_v3 as Drive  } from '@googleapis/drive';

const warn = debug('af/google#drive:warn');
const info = debug('af/google#drive:info');

// Given a path line /a/b/c, it will find the ID of the file at that path.
// Also can create the path if it does not exist.
export async function findFileAtPath({
  path,
  id='root',
  createIfNotExist=false,
  worksheetName=false
}: {
  path: string,
  id?: string,
  createIfNotExist?: boolean,
  worksheetName?: string | false,
}): Promise<{ id: string | null }> {
  if (!path || path.length < 1) { // path is empty, we're done
    return {id};
  }
  // If leading slash, this is root:
  if (path[0] === '/') path = path.slice(1); // just get rid of preceding slash since id defaults to 'root'
  const parts = path.split('/'); 
  const name = parts[0]; // get the top one 
  const rest = parts.slice(1); 
  const found = await findFileInFolder({id,name});

  if (!found) {
    if (!createIfNotExist) {
      warn('findFileAtPath: WARNING: searched for path '+path+', but found null');
      return { id:null };
    }
    // Otherwise, create this part of the path if it doesn't exist
    if (parts.length === 1) { // this is the spreadsheet at the bottom
      info('findFileAtPath: creating spreadsheet ',name, ' in parent id', id);
      const result = await createSpreadsheet({
        name,
        parentid: id==='root' ? false : id,
        worksheetName: worksheetName || 'undefined-worksheetname'
      });
      info('Created spreadsheet, result = ', result);
      return ({id: result?.id}); // no need to recursively call again because this is bottom
    }
    // otherwise, this is a folder, create it
    info('findFileAtPath: creating folder ', name, ' in parent id ', id);
    const result = await createFolder({name, parentid: id==='root' ? false:id,});
    return findFileAtPath({ 
      path: rest.join('/'), 
      id: result.id, 
      createIfNotExist, 
      worksheetName
    });
  }
  info('google.findFileAtPath: found ',name,', going down rest of path ',rest.join('/'));
  return findFileAtPath({ 
    path: rest.join('/'), 
    id: found.id, 
    createIfNotExist, 
    worksheetName
  });
};


// Given a path, find it's ID:
export async function idFromPath({
  path,
  createIfNotExist=false,
  worksheetName=false
}: {
  path: string,
  createIfNotExist: boolean,
  worksheetName: string | false
}): Promise<{ id: string }> {
  const result = await findFileAtPath({path,createIfNotExist,worksheetName});
  info('returned from findFileAtPath, result = ', result);
  if (!result || !result.id) throw new Error('Could not find file at path '+path);
  return {id:result.id};
}

// Create a file in 
export async function createFile({
  parentid=null,
  name,
  mimeType
}: {
  parentid?: string | null | false,
  name: string,
  mimeType: string
}): Promise<{ id: string }> {
  try { 
    const c = await client();
    const file: Drive.Schema$File = await c.drive.files.create({
      resource: { 
        name, 
        mimeType,
        parents: parentid ? [parentid] : [],
      },
      fields: 'id',
    });
    info('createFile: returning file = ', file.id);
    return {id: file.id}; 
  } catch(e) {
    warn('ERROR: createFile: failed to create file ', name, '.  Error was: ', e);
    throw oerror.tag(e, 'createFile: failed to create file.');
  }
}

export function createFolder({parentid=null,name}) {
  return createFile({parentid,name,mimeType: 'application/vnd.google-apps.folder'});
}

export async function findFileInFolder(
  {id,name}: 
  { id: string, name: string}
): Promise<Drive.Schema$File> {
  const c = await client();
  const res: Drive.Schema$FileList = await c.drive.files.list({
    q: `name='${name}' and trashed=false and '${id}' in parents`,
    fileId: id,
    spaces: 'drive',
  });
  let files = res.files;
  if (files && files.length > 1) {
    info('findFileInfolder: Found more than 1 file ('+files.length+'), filtering for case-sensitive now');
    // Their search is case-insensitve so it will return all matches with same case.
    files = files.filter(f => f.name === name); // do our own case-sensitive search
    if (files.length > 1) {
      warn('findFileInFolder: WARNING: Found '+files.length+' files with name ', name, ': ', files);
    }
  }
  if (!files || files.length < 1) {
    warn('findFileInFolder: WARNING: Did not find folder', name);
    return null;
  }
  return files[0];
}


