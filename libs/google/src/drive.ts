// Google Drive functions
import debug from 'debug';
import { client } from './core';
import * as oerror from '@overleaf/o-error';
// Note these are node-specific @googleapis libraries, but they have the 
// typescript typings we need:
import type { drive_v3 as Drive  } from '@googleapis/drive';

const warn = debug('af/google#drive:warn');
const info = debug('af/google#drive:info');
const trace = debug('af/google#drive:trace');

// Given a path line /a/b/c, it will find the ID of the folder at that path
// If the path does not exist, it will create it
export async function ensurePath({
  path,
  id='root',
  donotcreate=false,
}: {
  path: string,
  id?: string | null,
  donotcreate?: boolean
}): Promise<{ id: string } | null> {
  if (!path || path.length < 1) { // path is empty, we're done
    trace('path is empty, returning id ', id);
    return id ? {id} : null;
  }
  // If leading slash, this is root:
  if (path[0] === '/') path = path.slice(1); // just get rid of preceding slash since id defaults to 'root'
  const parts = path.split('/'); 
  const name = parts[0]; // get the top one 
  if (!name) {
    trace('after split, name is empty, returning id ', id);
    return id ? {id} : null;
  }
  const rest = parts.slice(1); 
  trace('ensurePath: checking for file ',name,' in folder with  id ', id);
  const found = await findFileInFolder({id,name});

  if (!found) {
    if (donotcreate) {
      warn('WARNING: google.ensurePath: did not find path, and donotcreate=true so we did not create it');
      return null;
    }
    // Create this part of the path if it doesn't exist
    info('ensurePath: creating folder ', name, ' in parent id ', id);
    const result = await createFolder({name, parentid: id==='root' ? null : id,});
    return ensurePath({ 
      path: rest.join('/'), 
      id: result?.id, 
    });
  }
  trace('google.ensurePath: found ',name,', going down rest of path ',rest.join('/'));
  return ensurePath({ 
    path: rest.join('/'), 
    id: found.id, 
  });
};


// Given a path, find it's ID:
export async function idFromPath({path}: {path: string}): Promise<{ id: string }> {
  const result = await ensurePath({path,donotcreate: true});
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
}): Promise<{ id: string } | null> {
  try { 
    const c = await client();
    const res = await c.drive.files.create({
      resource: { 
        name, 
        mimeType,
        parents: parentid ? [parentid] : [],
      },
      fields: 'id',
    });
    const file = res?.result;
    if (!file?.id) return null;
    return { id: file.id };
  } catch(e) {
    warn('ERROR: createFile: failed to create file ', name, '.  Error was: ', e);
    throw oerror.tag(e as Error, 'createFile: failed to create file.');
  }
}

export function createFolder({parentid=null,name}: { parentid?: string | null, name: string}) {
  return createFile({parentid,name,mimeType: 'application/vnd.google-apps.folder'});
}

export async function findFileInFolder(
  {id,name}: 
  { id: string | null, name: string}
): Promise<Drive.Schema$File | null> {
  if (!id) return null;
  const c = await client();
  const res = await c.drive.files.list({
    q: `name='${name}' and trashed=false and '${id}' in parents`,
    fileId: id,
    spaces: 'drive',
  });
  let files = (res?.result as Drive.Schema$FileList)?.files;
  if (files && files.length > 1) {
    // Their search is case-insensitve so it will return all matches with same case.
    files = files.filter(f => f.name === name); // do our own case-sensitive search
    if (files.length > 1) {
      warn('findFileInFolder: WARNING: Found '+files.length+' files with name ', name, ': ', files);
    }
  }
  if (!files || files.length < 1 || !files[0]) {
    trace('findFileInFolder: WARNING: Did not find folder', name);
    return null;
  }
  return files[0];
}

