import _ from 'lodash';

export const findFileInFolder = ({id,name}) => window.gapi.client.drive.files.list({
       q: `name='${name}' and trashed=false`,
  fileId: id,
  spaces: 'drive',
}).then(res => res.result.files)
.then(files => {
  if (files && files.length > 1) {
    console.log('findFileInfolder: Found more than 1 file ('+files.length+'), filtering for case-sensitive now');
    // Their search is case-insensitve so it will return all matches with same case.
    files = _.filter(files, f => f.name === name); // do our own case-sensitive search
    if (files.length > 1) {
      console.log('findFileInFolder: WARNING: Found '+files.length+' files with name ', name, ': ', files);
    }
  }
  if (!files || files.length < 1) {
    console.log('findFileInFolder: ERROR: Did not find folder', name);
    return null;
  }
  return files[0];
});

//-----------------------------------------------------------------------
// Given a path line /a/b/c, it will find the ID of the file at that path.
export const findFileAtPath = ({path,id='root'}) => {
  if (!path || path.length < 1) { // path is empty, we're done
    return id;
  }
  // If leading slash, this is root:
  if (path[0] === '/') path = path.slice(1); // just get rid of preceding slash since id defaults to 'root'
  const name = _.split(path, '/')[0]; // get the top one
  return findFileInFolder({id,name}).then(found => { // find it's info
    if (!found) {
      console.log('findFileAtPath: WARNING: searched for path '+path+', but found null');
      return null;
    }
    const rest = _.split(path, '/').slice(1);
    return findFileAtPath({ path: _.join(rest,'/'), id: found.id });
  })
};


